import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_BYTES = 20 * 1024 * 1024

export function getStorageType(): "local" | "s3" {
  return process.env.STORAGE_TYPE === "s3" ? "s3" : "local"
}

export function buildLocalUrl(filename: string) {
  return `/uploads/${filename}`
}

export function validateFile(mimeType: string, bytes: number) {
  if (!ALLOWED_TYPES.has(mimeType)) return `Unsupported file type: ${mimeType}`
  if (bytes > MAX_BYTES) return "File exceeds 20MB limit"
  return null
}

function extFromMime(mimeType: string) {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[mimeType] ?? "bin"
}

export async function saveLocalFile(buffer: Buffer, mimeType: string) {
  const filename = `${randomUUID()}.${extFromMime(mimeType)}`
  const dir = path.join(process.cwd(), "public", "uploads")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)
  return buildLocalUrl(filename)
}

export async function saveS3File(buffer: Buffer, mimeType: string) {
  const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3")
  const key = `uploads/${randomUUID()}.${extFromMime(mimeType)}`
  const client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  })
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    }),
  )
  const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "")
  return `${endpoint}/${process.env.S3_BUCKET_NAME}/${key}`
}

export async function uploadFile(buffer: Buffer, mimeType: string) {
  return getStorageType() === "s3" ? saveS3File(buffer, mimeType) : saveLocalFile(buffer, mimeType)
}
