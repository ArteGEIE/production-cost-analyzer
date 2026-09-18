# .infrastructure/

Kubernetes deployment of the app as a Helm chart. Nothing here is specific to a
cloud provider: any cluster with an ingress controller and a PostgreSQL database
reachable from the pods will do.

## Layout

    helm/app/
      Chart.yaml
      values.yaml                     Base defaults. image/hosts empty → deploy without an overlay fails loudly.
      values/
        values.example.yaml           Production-style overlay (OIDC, 2 replicas, TLS via cert-manager)
        values.demo.example.yaml      Public demo overlay (DEMO_MODE=true, 1 replica)
      templates/
        deployment.yaml               App container (port 3000), probes on /api/health*
        service.yaml                  ClusterIP :3000
        ingress.yaml                  Optional TLS block
        external-secret.yaml          Optional: sync secrets via External Secrets Operator
        migrate-job.yaml              Drizzle migrations, Helm post-install/pre-upgrade hook
        pdb.yaml                      PodDisruptionBudget

## Secrets

Two options, pick one per release:

- **`secretEnv.existingSecret`** — a plain Kubernetes Secret you create yourself.
  Every name in `secretEnv.keys` is injected as an env var of the same name.
- **`externalSecret`** — [External Secrets Operator](https://external-secrets.io)
  syncs the listed keys from your secret manager into `<release>-secrets`.
  Set `decodingStrategy` to match how values are stored (`None` for raw values).
  If [Stakater Reloader](https://github.com/stakater/Reloader) is installed, pods
  restart automatically on rotation.

Required secret keys: `DATABASE_URL`, `AUTH_SECRET`, `LLM_API_KEY`,
`MISTRAL_API_KEY`, plus `AUTH_OIDC_CLIENT_ID` for OIDC deployments.

## Ingress timeouts

`/api/extract` streams Server-Sent Events for several minutes. Raise the proxy
read/send timeouts on your ingress (see the annotations in the example overlay)
or long extractions get cut off.

## Database

Managed PostgreSQL 15+ or an in-cluster instance. Prefer a private-network
endpoint; the pods only need the `DATABASE_URL` secret. Migrations run from the
Helm hook Job (`migrate.enabled: true`) using `scripts/migrate.mjs` shipped in
the image.

## Deploy by hand

    helm upgrade --install production-cost .infrastructure/helm/app \
      -n production-cost --create-namespace \
      -f my-values.yaml \
      --set image.repository=ghcr.io/artegeie/production-cost-analyzer \
      --set image.tag=<sha or tag> \
      --wait --rollback-on-failure --timeout 8m

## Deploying your own instance

This repository deploys nothing. Keep everything specific to your deployment in a
small private repository of your own: the real values files, an optional
`custom.js`, a Dockerfile deriving your image from the published one, and the
workflow holding your registry and cluster credentials. That workflow checks out
this repository at the matching tag to get the chart. The pattern is described in
`docs/deployment.md`.
