# Deployment

The app is one container: a Next.js standalone server on port 3000 that needs a
PostgreSQL 15+ database and outbound HTTPS to your LLM endpoint and to the Mistral OCR
API. Run it on whatever you already operate. This page lists what the container needs;
it does not prescribe a platform.

## Container image

Published to GitHub Container Registry by `.github/workflows/docker-publish.yml`:

- `ghcr.io/artegeie/production-cost-analyzer:latest` — every push to `main`
- `ghcr.io/artegeie/production-cost-analyzer:X.Y.Z` and `X.Y` — tagged releases
- `ghcr.io/artegeie/production-cost-analyzer:sha-<commit>`

Build it yourself with `docker build -t production-cost-analyzer .`.

## What the container needs

- **Environment** — see `.env.example` and `docs/configuration.md`. Nothing is read at
  build time, so one image serves any configuration.
- **Database** — `DATABASE_URL`. Run migrations before starting a new version with
  `node scripts/migrate.mjs` inside the image; it is idempotent and exits non-zero on
  failure. `node scripts/seed-demo.mjs` loads the demo dataset and the CC barème.
- **Port** 3000. **Health**: `GET /api/health` answers without touching the database
  (liveness); `GET /api/health/ready` runs `select 1` and returns 503 when the database
  is unreachable (readiness).
- **Reverse proxy** — `/api/extract` streams Server-Sent Events for several minutes:
  allow read timeouts of about an hour, disable response buffering, and accept request
  bodies of at least 25 MB for PDF uploads. Set `AUTH_URL` to the public URL and
  `AUTH_TRUST_HOST=true`.
- **Process** — runs as a non-root user and needs no writable filesystem.
- **Sizing** — idle memory is roughly 120 MB; an extraction holds the uploaded PDF in
  memory twice plus the pdfjs document graph, so size for the concurrent uploads you
  expect. Give the process a generous stop grace period so a deploy does not cut an
  in-flight extraction.
- **Custom script or logo** — add the files to `public/` before building, or derive an
  image from the published one:

  ```dockerfile
  FROM ghcr.io/artegeie/production-cost-analyzer:0.1.0
  COPY custom.js logo.svg /app/public/
  ```

## Reverse proxy example

Caddy, with the long read timeout and the unbuffered response the extraction stream needs:

```
production-cost.example.com {
    reverse_proxy app:3000 {
        transport http {
            read_timeout 1h
        }
        flush_interval -1
    }
}
```

## Docker Compose example

`docker-compose.yml` is an evaluation stack, not a deployment: PostgreSQL, migrations,
the demo dataset and the app in demo mode. `docker compose up`, then open
<http://localhost:3000>. For a real deployment, run the published image on your own
platform with the requirements above.

## Production checklist

- [ ] OIDC configured with `AUTH_REQUIRED_GROUP` (or an explicit `AUTH_OIDC_ALLOW_ANY=true`)
- [ ] `DEMO_MODE` unset; a demo instance, if any, has its own database and `AUTH_SECRET`
- [ ] `LOG_LEVEL=info`
- [ ] `AUTH_URL` set to the public URL (also whitelists Server Actions)
- [ ] Proxy read timeout ≥ 1 h, buffering off, body size ≥ 25 MB for PDF uploads
- [ ] Database backups; the `production_files` table only holds drafts under review
- [ ] `npm run db:seed:cc` (or `node scripts/seed-demo.mjs` without the demo rows: set
      `DEMO_DATASET_PATH` to an empty JSON array file) so the CC history page is populated
