import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface StoredFileVersion {
  versionId: string;
  size: number;
  uploadedAt: string;
  isLatest: boolean;
  contentType: string;
}

export interface StoredFile {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  isImage: boolean;
  versions: StoredFileVersion[];
  s3Key: string;
  url?: string;
}

export interface UserStorageQuota {
  usedBytes: number;
  maxBytes: number;
  usedPercentage: number;
  totalFiles: number;
  s3Configured: boolean;
  bucketName: string;
  region: string;
}

// 500 MB Fixed Quota Per User
export const USER_MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 524,288,000 bytes

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

// In-memory / persisted registry of file metadata
const userFileRegistry: Map<string, StoredFile[]> = new Map();

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function isS3Configured(): boolean {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET_NAME;

  return !!(
    accessKey &&
    secretKey &&
    bucket &&
    !accessKey.includes("YOUR_") &&
    !secretKey.includes("YOUR_")
  );
}

function getS3Client(): S3Client | null {
  if (!isS3Configured()) return null;

  return new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export function getUserQuota(userId: string): UserStorageQuota {
  const files = userFileRegistry.get(userId) || [];
  
  let usedBytes = 0;
  for (const file of files) {
    for (const v of file.versions) {
      usedBytes += v.size;
    }
  }

  const usedPercentage = Math.min(
    100,
    Number(((usedBytes / USER_MAX_STORAGE_BYTES) * 100).toFixed(1))
  );

  return {
    usedBytes,
    maxBytes: USER_MAX_STORAGE_BYTES,
    usedPercentage,
    totalFiles: files.length,
    s3Configured: isS3Configured(),
    bucketName: process.env.AWS_S3_BUCKET_NAME || "meetagent-cloud-storage-local",
    region: process.env.AWS_REGION || "ap-south-1",
  };
}

export function listUserFiles(userId: string): StoredFile[] {
  return userFileRegistry.get(userId) || [];
}

export async function saveUserFile(
  userId: string,
  file: {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  }
): Promise<{ file: StoredFile; quota: UserStorageQuota }> {
  const currentQuota = getUserQuota(userId);

  console.log(`[STORAGE UPLOAD] Request from user=${userId}, file=${file.originalname} (${file.size} bytes)`);

  // Check 500 MB Quota
  if (currentQuota.usedBytes + file.size > USER_MAX_STORAGE_BYTES) {
    const freeMB = ((USER_MAX_STORAGE_BYTES - currentQuota.usedBytes) / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Storage quota exceeded! You have ${freeMB} MB free out of 500 MB. This file requires ${(file.size / (1024 * 1024)).toFixed(1)} MB.`
    );
  }

  const s3 = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "meetagent-cloud-storage";
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `users/${userId}/${sanitizedName}`;
  const isImage = file.mimetype.startsWith("image/");
  const uploadedAt = new Date().toISOString();

  let versionId = `v_${Date.now()}`;

  // 1. If live S3 is configured, upload to AWS S3!
  if (s3) {
    try {
      console.log(`[AWS S3] Uploading ${s3Key} to bucket ${bucketName}...`);
      const s3Response = await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            uploadedBy: userId,
            originalName: file.originalname,
            uploadedAt,
          },
        })
      );
      if (s3Response.VersionId) {
        versionId = s3Response.VersionId;
      }
      console.log(`[AWS S3] Upload successful! VersionId: ${versionId}`);
    } catch (err: any) {
      console.warn(`[AWS S3 Warning] S3 upload failed (${err.message}). Saving to local storage.`);
    }
  }

  // 2. Save to local storage cache
  const safeUserDir = sanitizeId(userId);
  const userLocalDir = path.join(LOCAL_STORAGE_DIR, safeUserDir);
  if (!fs.existsSync(userLocalDir)) {
    fs.mkdirSync(userLocalDir, { recursive: true });
  }
  const localFilePath = path.join(userLocalDir, `${versionId}_${sanitizedName}`);
  fs.writeFileSync(localFilePath, file.buffer);
  console.log(`[LOCAL STORAGE] Saved to: ${localFilePath}`);

  // 3. Update file & version registry
  const existingFiles = userFileRegistry.get(userId) || [];
  let existingIndex = existingFiles.findIndex(
    (f) => f.originalName.toLowerCase() === file.originalname.toLowerCase()
  );

  const newVersion: StoredFileVersion = {
    versionId,
    size: file.size,
    uploadedAt,
    isLatest: true,
    contentType: file.mimetype,
  };

  let targetFile: StoredFile;

  if (existingIndex >= 0) {
    targetFile = existingFiles[existingIndex];
    targetFile.versions.forEach((v) => (v.isLatest = false));
    targetFile.versions.unshift(newVersion);
    targetFile.size = file.size;
    targetFile.uploadedAt = uploadedAt;
    targetFile.mimeType = file.mimetype;
    targetFile.isImage = isImage;
  } else {
    targetFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt,
      isImage,
      s3Key,
      versions: [newVersion],
    };
    existingFiles.unshift(targetFile);
  }

  userFileRegistry.set(userId, existingFiles);

  return {
    file: targetFile,
    quota: getUserQuota(userId),
  };
}

export function getFileContent(
  userId: string,
  fileId: string,
  versionId?: string
): { buffer: Buffer; fileName: string; mimeType: string } | null {
  const files = userFileRegistry.get(userId) || [];
  const file = files.find((f) => f.id === fileId);

  if (!file) return null;

  const targetVersion = versionId
    ? file.versions.find((v) => v.versionId === versionId)
    : file.versions[0];

  const vid = targetVersion?.versionId || file.versions[0]?.versionId;
  const sanitizedName = file.originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const safeUserDir = sanitizeId(userId);
  const localFilePath = path.join(LOCAL_STORAGE_DIR, safeUserDir, `${vid}_${sanitizedName}`);

  if (fs.existsSync(localFilePath)) {
    const buffer = fs.readFileSync(localFilePath);
    return {
      buffer,
      fileName: file.originalName,
      mimeType: file.mimeType,
    };
  }

  return null;
}

export async function deleteUserFile(
  userId: string,
  fileId: string,
  versionId?: string
): Promise<UserStorageQuota> {
  const files = userFileRegistry.get(userId) || [];
  const fileIndex = files.findIndex((f) => f.id === fileId);

  if (fileIndex === -1) {
    throw new Error("File not found");
  }

  const file = files[fileIndex];
  const s3 = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "meetagent-cloud-storage";

  if (versionId) {
    file.versions = file.versions.filter((v) => v.versionId !== versionId);
    if (file.versions.length > 0) {
      file.versions[0].isLatest = true;
      file.size = file.versions[0].size;
    } else {
      files.splice(fileIndex, 1);
    }
  } else {
    if (s3) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: file.s3Key,
          })
        );
      } catch {}
    }
    files.splice(fileIndex, 1);
  }

  userFileRegistry.set(userId, files);
  return getUserQuota(userId);
}
