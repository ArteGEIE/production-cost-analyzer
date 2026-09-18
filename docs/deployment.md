# Deployment

The app is a Next.js standalone server (port 3000) plus PostgreSQL. It needs outbound HTTPS
to your LLM endpoint and to the Mistral OCR API. `/api/extract` streams Server-Sent Events
for several minutes: any proxy in front needs read timeouts of an hour and response
buffering disabled.

Health endpoints: `GET /api/health` (liveness, no DB) and `GET /api/health/ready`
(readiness, runs `select 1`).

## Container image

Published to GitHub Container Registry by `.github/workflows/docker-publish.yml`:

- `ghcr.io/artegeie/production-cost-analyzer:latest` — every push to `main`
- `ghcr.io/artegeie/production-cost-analyzer:vX.Y.Z` and `X.Y` — tagged releases
- `ghcr.io/artegeie/production-cost-analyzer:sha-<commit>`

Build it yourself with `docker build -t production-cost-analyzer .`. The image also ships
`scripts/migrate.mjs` (migrations) and `scripts/seed-demo.mjs` (demo dataset + CC barème),
runnable with `node`.

## Docker Compose — single host

```bash
cp .env.example .env         # LLM_*, MISTRAL_API_KEY, AUTH_*, DATABASE_URL (external Postgres)
docker compose -f docker-compose.prod.yml up -d
```

The `migrate` service applies migrations and exits; `app` starts once it has succeeded.
Put a TLS-terminating reverse proxy in front. Caddy example:

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

For a throwaway evaluation with a bundled database, plain `docker compose up` (the default
`docker-compose.yml`) starts Postgres, seeds the demo data and enables `DEMO_MODE`.

## Kubernetes — Helm

The chart in `.infrastructure/helm/app` renders a Deployment (probes, non-root, rolling
update with zero unavailable), a Service, an optional Ingress with TLS, an optional
PodDisruptionBudget, an optional External Secrets `ExternalSecret`, and a post-install /
pre-upgrade Job that runs migrations before new pods roll out.

1. Create the secret (or configure `externalSecret`):

   ```bash
   kubectl -n production-cost create secret generic production-cost-secrets \
     --from-literal=DATABASE_URL=postgres://... \
     --from-literal=AUTH_SECRET=$(openssl rand -base64 32) \
     --from-literal=AUTH_OIDC_CLIENT_ID=... \
     --from-literal=LLM_API_KEY=... \
     --from-literal=MISTRAL_API_KEY=...
   ```

2. Copy `.infrastructure/helm/app/values/values.example.yaml`, set your hosts, issuer,
   branding and registry.

3. Deploy:

   ```bash
   helm upgrade --install production-cost .infrastructure/helm/app \
     -n production-cost --create-namespace \
     -f my-values.yaml \
     --set image.repository=ghcr.io/artegeie/production-cost-analyzer \
     --set image.tag=v0.1.0 \
     --wait --rollback-on-failure --timeout 8m
   ```

`.infrastructure/README.md` documents the values and the secret options in detail.

### Continuous deployment from a private repository

Nothing in this repository deploys anywhere, on purpose: Actions logs of a public
repository are public, and merging a pull request should not be a production release.
Run your instance from a small private repository that holds what is yours:

```
my-deployment/
├── Dockerfile          # derives your image from the published one
├── custom.js           # optional, see docs/configuration.md
├── values/prod.yaml    # real hosts, issuer, secret-store keys
├── values/demo.yaml
└── .github/workflows/deploy.yml
```

```dockerfile
FROM ghcr.io/artegeie/production-cost-analyzer:0.1.0
COPY custom.js /app/public/custom.js
```

The workflow builds that image and pushes it to your registry, checks out this
repository at the same tag (`actions/checkout` with `repository` and `ref`) to get
`.infrastructure/helm/app`, then runs `helm upgrade --install` with your values.
Releasing is a version bump in the private repository. Deploy a demo release first
when you have one: it is a free canary for the image and the migration before
production pods roll.

## Production checklist

- [ ] OIDC configured with `AUTH_REQUIRED_GROUP` (or an explicit `AUTH_OIDC_ALLOW_ANY=true`)
- [ ] `DEMO_MODE` unset; a demo instance, if any, has its own database and `AUTH_SECRET`
- [ ] `LOG_LEVEL=info`
- [ ] `AUTH_URL` set to the public URL (also whitelists Server Actions)
- [ ] Proxy read timeout ≥ 1 h, buffering off, body size ≥ 25 MB for PDF uploads
- [ ] Database backups; the `production_files` table only holds drafts under review
- [ ] `npm run db:seed:cc` (or `node scripts/seed-demo.mjs` without the demo rows: set
      `DEMO_DATASET_PATH` to an empty JSON array file) so the CC history page is populated
