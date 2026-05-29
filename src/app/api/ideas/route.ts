import { NextResponse } from "next/server"
import { getPublishedIdeas } from "@/lib/db/queries/ideas"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(await getPublishedIdeas())
}
