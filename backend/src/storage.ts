import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { pool, query, owned } from "./db.js";
const root = path.resolve(process.env.UPLOAD_DIR || "uploads");
const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });
const bucket = process.env.AWS_S3_BUCKET;
export async function upload(user: string, file: Express.Multer.File) {
  const title = file.originalname.slice(0, 200);
  const isPdf = file.buffer.subarray(0, 5).toString() === "%PDF-";
  if (!isPdf && !/\.(txt|md|srt|vtt)$/i.test(title))
    throw Error("Upload PDF, TXT, Markdown, SRT or VTT");
  const content = isPdf
    ? (await pdf(file.buffer)).text
    : file.buffer.toString("utf8");
  if (!content.trim())
    throw Error("No text found. Scanned PDFs need OCR before upload");
  if (content.length > 250000)
    throw Error("Document text is too long; split it into smaller documents");
  const id = randomUUID(),
    key = `${user}/${id}`;
  const db = await pool.connect();
  let stored = false;
  try {
    await db.query("BEGIN");
    await db.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user]);
    const { rows } = await db.query(
      "SELECT COALESCE(SUM(size),0) AS used FROM documents WHERE user_id=$1",
      [user],
    );
    if (Number(rows[0].used) + file.size > 500 * 1024 * 1024)
      throw Error("500 MB storage quota exceeded");
    const versions = await db.query(
      "SELECT COALESCE(MAX(version),0) AS latest FROM documents WHERE user_id=$1 AND title=$2",
      [user, title],
    );
    if (bucket)
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: isPdf ? "application/pdf" : "text/plain",
        }),
      );
    else {
      await mkdir(path.join(root, user), { recursive: true });
      await writeFile(path.join(root, key), file.buffer);
    }
    stored = true;
    await db.query(
      "INSERT INTO documents(id,user_id,title,content,storage_key,mime,size,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        user,
        title,
        content,
        key,
        isPdf ? "application/pdf" : "text/plain",
        file.size,
        Number(versions.rows[0].latest) + 1,
      ],
    );
    await db.query("COMMIT");
    return { id, title };
  } catch (e) {
    await db.query("ROLLBACK");
    if (stored) {
      if (bucket)
        await s3
          .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
          .catch(() => {});
      else await unlink(path.join(root, key)).catch(() => {});
    }
    throw e;
  } finally {
    db.release();
  }
}
export async function download(user: string, id: string) {
  const d = await owned("documents", id, user);
  const buffer = bucket
    ? Buffer.from(
        await (
          await s3.send(
            new GetObjectCommand({ Bucket: bucket, Key: d.storage_key }),
          )
        ).Body!.transformToByteArray(),
      )
    : await readFile(path.join(root, d.storage_key));
  return { buffer, document: d };
}
export async function removeDocument(user: string, id: string) {
  const d = await owned("documents", id, user);
  if (bucket)
    await s3.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: d.storage_key }),
    );
  else
    await unlink(path.join(root, d.storage_key)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  await query("DELETE FROM documents WHERE id=$1 AND user_id=$2", [id, user]);
}
