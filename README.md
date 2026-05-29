# Inkycut

## Local Development

1. Copy `.env.example` to `.env.local`.
2. Start Postgres:

```bash
npm run db:up
```

3. Apply migrations:

```bash
npm run db:migrate
```

4. Start the app with Socket.io:

```bash
npm run dev
```

The local Postgres container listens on `localhost:55432` to avoid conflicts with a system Postgres on `5432`.
