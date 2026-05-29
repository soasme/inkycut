import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile, validateFile } from "@/lib/storage"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const file = (await req.formData()).get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const error = validateFile(file.type, file.size)
  if (error) return NextResponse.json({ error }, { status: 400 })

  const url = await uploadFile(Buffer.from(await file.arrayBuffer()), file.type)
  return NextResponse.json({ url })
}
