const mockMkdir = jest.fn()
const mockWriteFile = jest.fn()
const mockSend = jest.fn()
const mockS3Client = jest.fn(() => ({ send: mockSend }))
const mockPutObjectCommand = jest.fn((input) => input)

jest.mock("crypto", () => ({ randomUUID: () => "uuid" }))
jest.mock("fs/promises", () => ({ mkdir: mockMkdir, writeFile: mockWriteFile }))
jest.mock("@aws-sdk/client-s3", () => ({ S3Client: mockS3Client, PutObjectCommand: mockPutObjectCommand }))

import path from "path"
import { buildLocalUrl, getStorageType, saveLocalFile, saveS3File, uploadFile, validateFile } from "@/lib/storage"

describe("storage helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STORAGE_TYPE = "local"
    process.env.AWS_REGION = "test-region"
    process.env.S3_ENDPOINT = "http://storage.test/"
    process.env.S3_BUCKET_NAME = "bucket"
    process.env.AWS_ACCESS_KEY_ID = "access"
    process.env.AWS_SECRET_ACCESS_KEY = "secret"
  })

  it("selects local storage by default and s3 when configured", () => {
    delete process.env.STORAGE_TYPE
    expect(getStorageType()).toBe("local")
    process.env.STORAGE_TYPE = "s3"
    expect(getStorageType()).toBe("s3")
  })

  it("builds local upload urls and validates file type and size", () => {
    expect(buildLocalUrl("abc.jpg")).toBe("/uploads/abc.jpg")
    expect(validateFile("image/jpeg", 1024)).toBeNull()
    expect(validateFile("application/pdf", 1024)).toContain("Unsupported")
    expect(validateFile("image/jpeg", 21 * 1024 * 1024)).toContain("20MB")
  })

  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
    ["application/octet-stream", "bin"],
  ])("stores local %s files with the %s extension", async (mimeType, extension) => {
    await expect(saveLocalFile(Buffer.from("bytes"), mimeType)).resolves.toBe(`/uploads/uuid.${extension}`)
    expect(mockMkdir).toHaveBeenCalledWith(path.join(process.cwd(), "public", "uploads"), { recursive: true })
    expect(mockWriteFile).toHaveBeenCalledWith(path.join(process.cwd(), "public", "uploads", `uuid.${extension}`), Buffer.from("bytes"))
  })

  it("uploads to s3 and trims an endpoint trailing slash", async () => {
    await expect(saveS3File(Buffer.from("bytes"), "image/png")).resolves.toBe("http://storage.test/bucket/uploads/uuid.png")
    expect(mockS3Client).toHaveBeenCalledWith({
      region: "test-region",
      endpoint: "http://storage.test/",
      credentials: { accessKeyId: "access", secretAccessKey: "secret" },
    })
    expect(mockPutObjectCommand).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "uploads/uuid.png",
      Body: Buffer.from("bytes"),
      ContentType: "image/png",
      ACL: "public-read",
    })
    expect(mockSend).toHaveBeenCalled()
  })

  it("uses empty s3 credential and endpoint fallbacks", async () => {
    delete process.env.S3_ENDPOINT
    delete process.env.AWS_ACCESS_KEY_ID
    delete process.env.AWS_SECRET_ACCESS_KEY
    await expect(saveS3File(Buffer.from("bytes"), "image/gif")).resolves.toBe("/bucket/uploads/uuid.gif")
    expect(mockS3Client).toHaveBeenCalledWith({
      region: "test-region",
      endpoint: undefined,
      credentials: { accessKeyId: "", secretAccessKey: "" },
    })
  })

  it("routes uploads through the selected adapter", async () => {
    await expect(uploadFile(Buffer.from("local"), "image/png")).resolves.toBe("/uploads/uuid.png")
    process.env.STORAGE_TYPE = "s3"
    await expect(uploadFile(Buffer.from("remote"), "image/png")).resolves.toBe("http://storage.test/bucket/uploads/uuid.png")
  })
})
