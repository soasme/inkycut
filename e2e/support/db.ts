import { randomUUID } from "crypto"
import { loadEnvConfig } from "@next/env"
import { Pool } from "pg"

loadEnvConfig(process.cwd())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export interface TestUser {
  id: string
  name: string
  email: string
  image: string
}

export interface TestProject {
  id: string
  name: string
}

export function e2eName(label: string) {
  return `E2E ${label} ${randomUUID().slice(0, 8)}`
}

export function createTestUser(label = "User"): TestUser {
  const id = `e2e-${randomUUID()}`
  return {
    id,
    name: e2eName(label),
    email: `${id}@example.test`,
    image: "https://example.test/avatar.png",
  }
}

export async function insertUser(user: TestUser) {
  await pool.query(
    `
      insert into users (id, name, email, image)
      values ($1, $2, $3, $4)
      on conflict (id) do update set name = excluded.name, email = excluded.email, image = excluded.image
    `,
    [user.id, user.name, user.email, user.image],
  )
}

export async function insertProject(userId: string, name = e2eName("Project")): Promise<TestProject> {
  const result = await pool.query<{ id: string; name: string }>(
    `insert into projects (user_id, name) values ($1, $2) returning id, name`,
    [userId, name],
  )
  await pool.query(`insert into conversations (project_id, name) values ($1, 'Main')`, [result.rows[0].id])
  return result.rows[0]
}

export async function insertElement(projectId: string, type: string, data: Record<string, unknown> = {}) {
  const result = await pool.query<{ id: string }>(
    `
      insert into elements (project_id, type, x, y, w, h, data)
      values ($1, $2, 160, 120, 320, 180, $3::jsonb)
      returning id
    `,
    [projectId, type, JSON.stringify(data)],
  )
  return result.rows[0]
}

export async function publishIdea(input: {
  projectId: string
  userId: string
  title: string
  description?: string
  genre?: string
}) {
  await pool.query(
    `
      insert into ideas (project_id, user_id, title, description, genre, tags, published_at)
      values ($1, $2, $3, $4, $5, $6, now())
    `,
    [input.projectId, input.userId, input.title, input.description ?? "", input.genre ?? "Drama", ["e2e"]],
  )
}

export async function cleanupUser(userId: string) {
  await pool.query(`delete from users where id = $1`, [userId])
}

export async function closeDb() {
  await pool.end()
}
