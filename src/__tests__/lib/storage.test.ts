import { buildLocalUrl, getStorageType, validateFile } from "@/lib/storage"

describe("storage helpers", () => {
  afterEach(() => {
    process.env.STORAGE_TYPE = "local"
  })

  it("detects local storage", () => {
    process.env.STORAGE_TYPE = "local"
    expect(getStorageType()).toBe("local")
  })

  it("detects s3 storage", () => {
    process.env.STORAGE_TYPE = "s3"
    expect(getStorageType()).toBe("s3")
  })

  it("builds local upload urls", () => {
    expect(buildLocalUrl("abc.jpg")).toBe("/uploads/abc.jpg")
  })

  it("validates file type and size", () => {
    expect(validateFile("image/jpeg", 1024)).toBeNull()
    expect(validateFile("application/pdf", 1024)).toContain("Unsupported")
    expect(validateFile("image/jpeg", 21 * 1024 * 1024)).toContain("20MB")
  })
})
