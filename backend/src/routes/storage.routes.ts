import { Router, Request, Response } from "express";
import multer from "multer";
import { descopeClient } from "../config/descope.js";
import { ensureUser } from "../repositories/user.repository.js";
import {
  getUserQuota,
  listUserFiles,
  saveUserFile,
  getFileContent,
  deleteUserFile,
} from "../services/storage.service.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max per single file upload
  },
});

// Middleware to authenticate via Bearer header OR ?token= query parameter (for <img src="...">)
async function authenticateStorage(req: Request, res: Response, next: Function) {
  let token: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  } else if (typeof req.query.token === "string" && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    console.warn(`[STORAGE AUTH] Missing Authorization token on ${req.method} ${req.originalUrl}`);
    res.status(401).json({ error: "Unauthorized: Missing authentication token" });
    return;
  }

  try {
    const authInfo = await descopeClient.validateSession(token);
    const claims = (authInfo?.token ?? {}) as Record<string, unknown>;
    const authUserId = String(claims.sub ?? "");

    if (!authInfo || !authUserId) {
      res.status(401).json({ error: "Unauthorized: Invalid session" });
      return;
    }

    const email = typeof claims.email === "string" ? claims.email : undefined;
    const user = await ensureUser({ authUserId, email });

    req.authContext = {
      authUserId,
      email,
      name: typeof claims.name === "string" ? claims.name : undefined,
      userId: user.id,
      token: claims,
    };

    next();
  } catch (err) {
    console.error(`[STORAGE AUTH ERROR] Session validation failed:`, err);
    res.status(401).json({ error: "Unauthorized: Session expired" });
  }
}

router.use(authenticateStorage);

// GET /api/storage/files — List all uploaded files + quota status
router.get("/files", async (req: Request, res: Response) => {
  try {
    const authUserId = req.authContext!.authUserId;
    const files = listUserFiles(authUserId);
    const quota = getUserQuota(authUserId);

    res.json({
      files,
      quota,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve files" });
  }
});

// POST /api/storage/upload — Upload a new file or version
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const authUserId = req.authContext!.authUserId;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file provided in form-data" });
    }

    console.log(`[STORAGE ROUTE] Uploading: ${uploadedFile.originalname}, size=${uploadedFile.size}`);

    const result = await saveUserFile(authUserId, {
      originalname: uploadedFile.originalname,
      mimetype: uploadedFile.mimetype,
      buffer: uploadedFile.buffer,
      size: uploadedFile.size,
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error(`[STORAGE ROUTE ERROR] Upload error:`, err);
    res.status(400).json({ error: err.message || "Failed to upload file" });
  }
});

// GET /api/storage/download/:fileId — Download file or specific version
router.get("/download/:fileId", async (req: Request, res: Response) => {
  try {
    const authUserId = req.authContext!.authUserId;
    const fileId = String(req.params.fileId);
    const versionId = req.query.versionId as string | undefined;

    const fileData = getFileContent(authUserId, fileId, versionId);

    if (!fileData) {
      return res.status(404).json({ error: "File not found or version does not exist" });
    }

    res.setHeader("Content-Type", fileData.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileData.fileName}"`);
    res.send(fileData.buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to download file" });
  }
});

// DELETE /api/storage/files/:fileId — Delete a file or specific version
router.delete("/files/:fileId", async (req: Request, res: Response) => {
  try {
    const authUserId = req.authContext!.authUserId;
    const fileId = String(req.params.fileId);
    const versionId = req.query.versionId as string | undefined;

    const updatedQuota = await deleteUserFile(authUserId, fileId, versionId);

    res.json({
      success: true,
      message: versionId ? `Version ${versionId} deleted` : "File deleted successfully",
      quota: updatedQuota,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete file" });
  }
});

export default router;
