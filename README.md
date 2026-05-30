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

## Testing

Run the unit and integration suite with coverage:

```bash
npm run test:coverage
```

Run the browser-level suite:

```bash
npm run test:e2e
```

The E2E harness starts the app and a local stub server for external integrations automatically. See [docs/testing.md](./docs/testing.md) for setup, architecture, available commands, and how to add stubbed integrations.
