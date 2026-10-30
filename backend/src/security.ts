import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { query } from "./db.js";
import type { RequestHandler } from "express";
export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const secret = () => {
  const v = process.env.JWT_SECRET;
  if (!v || v.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(v);
};
export async function access(user: string, sid: string) {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user)
    .setIssuer("meetagent")
    .setAudience("meetagent-api")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}
declare global {
  namespace Express {
    interface Request {
      userId: string;
      sessionId: string;
    }
  }
}
export const auth: RequestHandler = async (req, res, next) => {
  try {
    const raw = req.headers.authorization?.replace(/^Bearer /, "");
    if (!raw) throw Error();
    const { payload } = await jwtVerify(raw, secret(), {
      issuer: "meetagent",
      audience: "meetagent-api",
      algorithms: ["HS256"],
    });
    const [session] = await query(
      "SELECT id FROM sessions WHERE id=$1 AND user_id=$2 AND expires>NOW()",
      [payload.sid, payload.sub],
    );
    if (!session) throw Error();
    req.userId = payload.sub!;
    req.sessionId = String(payload.sid);
    next();
  } catch {
    res.status(401).json({ error: "Please sign in again" });
  }
};
function encryptionKey() {
  const k = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || "", "hex");
  if (k.length !== 32)
    throw Error("TOKEN_ENCRYPTION_KEY must be 64 hex characters");
  return k;
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  return Buffer.concat([
    iv,
    c.update(value),
    c.final(),
    c.getAuthTag(),
  ]).toString("base64");
}
export function decrypt(value: string) {
  const b = Buffer.from(value, "base64");
  const c = createDecipheriv("aes-256-gcm", encryptionKey(), b.subarray(0, 12));
  c.setAuthTag(b.subarray(-16));
  return Buffer.concat([c.update(b.subarray(12, -16)), c.final()]).toString();
}
