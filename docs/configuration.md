# Configuration reference

Everything specific to a deployment is an environment variable or a JSON file. The app
reads variables at request time (no `NEXT_PUBLIC_*`), so one container image serves any
organisation. `.env.example` lists every variable with a working default.

## LLM and OCR

| Variable | Required | Description |
|---|---|---|
| `LLM_BASE_URL` | yes | OpenAI-compatible endpoint, with the `/v1` path. Use a [LiteLLM](https://docs.litellm.ai/) proxy to reach Anthropic, Mistral, Bedrock, Ollama… |
| `LLM_API_KEY` | yes | Key for that endpoint |
| `LLM_MODEL` | no | Model name as the endpoint knows it (default `claude-sonnet-4-6`) |
| `MISTRAL_API_KEY` | yes | Mistral OCR, used only for PDFs without an embedded text layer |
| `OCR_MODEL` | no | default `mistral-ocr-latest` |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error` \| `silent`. Keep `info` in production: `debug` logs excerpts of the uploaded budget. |

## Database

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL 15+ connection string |
| `DATABASE_POOL_MAX` | Connections per app process (default 5) |

Migrations: `npm run db:migrate` locally, `node scripts/migrate.mjs` inside the image (used
by Compose and the Helm hook Job).

## Authentication

At least one provider must be configured or the app refuses to start.

| Variable | Description |
|---|---|
| `AUTH_OIDC_ISSUER` + `AUTH_OIDC_CLIENT_ID` | Enable the generic OIDC provider (Keycloak, Auth0, Authentik, Entra ID, Google Workspace…). Redirect URI: `https://<host>/api/auth/callback/oidc` |
| `AUTH_OIDC_CLIENT_SECRET` | Optional — leave empty for a public client with PKCE |
| `AUTH_OIDC_NAME` | Label of the sign-in button (default "SSO") |
| `AUTH_REQUIRED_GROUP` | Only members of this group claim may sign in. **Required with OIDC** unless `AUTH_OIDC_ALLOW_ANY=true` |
| `AUTH_OIDC_ALLOW_ANY` | `true` to accept any authenticated OIDC user (IdP without group claims) |
| `DEMO_MODE` | `true` enables a passwordless demo user. Never on an instance holding real data |
| `AUTH_SECRET` | JWT signing key (`npx auth secret`) — distinct per instance |
| `AUTH_URL` | Public URL of the app |
| `AUTH_TRUST_HOST` | `true` behind a reverse proxy / in containers |
| `SERVER_ACTIONS_ALLOWED_ORIGINS` | Extra hostnames allowed to call Server Actions, comma-separated. `AUTH_URL`'s host is always allowed |

## Branding and theme

| Variable | Description |
|---|---|
| `APP_NAME` | Product name in the header, on the sign-in page and in the browser title. Falls back to the translated default |
| `APP_BADGE` | Small badge next to the name (e.g. `Beta`). Hidden when empty |
| `APP_LOGO_URL` | Logo image: absolute `https://` URL or a root-relative path. Mount your own file into `public/` (Docker: `-v ./logo.svg:/app/public/logo.svg`) and set `/logo.svg` |
| `APP_FAVICON_URL` | Favicon override |
| `APP_THEME_HUE` | oklch hue 0–360 of the primary colour. Every tinted token (accents, borders, sidebar, first chart colour) follows it. Default `28.5` (orange) |
| `APP_THEME_CHROMA` | oklch chroma 0–0.4 of the primary colour. Default `0.222`; lower is more muted |
| `APP_PRIMARY_COLOR` | Explicit primary colour (any CSS colour) applied in both light and dark mode; overrides hue/chroma for the primary itself |
| `APP_PRIMARY_FOREGROUND_COLOR` | Text colour on primary surfaces, when the default white/near-black does not fit |
| `APP_THEME_CSS_URL` | Additional stylesheet loaded after the built-in theme, for anything the variables above do not cover (fonts, radii, any `--token`). Redefine the CSS custom properties from `src/app/globals.css` |

Colour values are validated against a strict grammar before being emitted, so an
unexpected value falls back to the default rather than breaking the page.

Quick recipe for a blue theme: `APP_THEME_HUE=250 APP_THEME_CHROMA=0.18`.

## Custom script (`public/custom.js`)

Feedback widgets, analytics tags and chat loaders are not configured through
environment variables. Put your JavaScript in `public/custom.js` before building:
the file is gitignored, is bundled like any other static asset, and the app loads
it in `<head>` once the page is interactive whenever it is present. Nothing in the
repository names a vendor; the file belongs to your build.

Typical content — the settings object a vendor's loader expects, then the loader:

```js
window.widgetSettings = { id: "your-project-id" };
var s = document.createElement("script");
s.src = "https://cdn.example.com/widget.js";
s.async = true;
document.head.appendChild(s);
```

Keep the file in your private deployment repository and copy it into a derived
image (see `docs/deployment.md`). In development, restart `npm run dev` after adding
or removing it. The file is served like any static asset, so it must
not contain secrets.

## Referentials (`config/*.json`)

Business defaults are plain JSON files, read at build time and typed in `src/lib/config/`:

| File | Content | Editable in the UI |
|---|---|---|
| `production-types.json` | Types offered in the review form and suggested to the LLM | Paramètres → Types |
| `cnc-mapping.json` | FR/DE/EN job titles → CNC category + `role_key`, injected into the extraction prompt | Paramètres → Correspondances CNC |
| `cc-minimums.json` | Collective-agreement minimum daily rates with their effective date | Paramètres → Conventions collectives |
| `structural-thresholds.json` | Rules R3–R7 thresholds | Paramètres → Seuils d'alerte |

Precedence, highest first:

1. values saved from the settings UI (table `settings`, or `cc_minimums` for rates)
2. files in `APP_CONFIG_DIR` (a directory mounted at runtime; only the files present there override)
3. the bundled `config/*.json`

`APP_CONFIG_DIR` files are read once per process — restart after editing. Load the CC
minimums into the database with `npm run db:seed:cc` (or `node scripts/seed-demo.mjs`
inside the image); until then the app uses the JSON as a fallback.

The 10 CNC categories themselves (`src/lib/config/cnc-grid.ts`) and the anomaly rules are
part of the domain model, not configuration; the organisation-facing category labels are in
the message catalogs (`config.cncGridOrg.*`).

## Languages

The UI ships in French (default) and German; the locale follows the `NEXT_LOCALE` cookie
then `Accept-Language`. Add a language by creating `messages/<locale>.json` with the same
keys and registering the locale in `src/i18n/routing.ts`.
