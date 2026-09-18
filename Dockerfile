# --- Stage 1: Install dependencies ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# --- Stage: migration dependencies ---
# drizzle-orm is not resolvable from .next/standalone/node_modules — the
# standalone build inlines it into the route chunks — so the migrate Job needs
# real copies. Versions are read out of package-lock.json so this stage can
# never drift from the app's own versions, and a dep vanishing from the lockfile
# fails the build loudly instead of at migrate time.
FROM node:22-alpine AS migrate-deps
WORKDIR /deps/build
COPY package-lock.json /deps/package-lock.json
RUN node -e "const l=require('/deps/package-lock.json').packages; const v=n=>{const p=l['node_modules/'+n]; if(!p||!p.version) throw new Error('migrate dep missing from lockfile: '+n); return p.version;}; require('fs').writeFileSync('package.json', JSON.stringify({name:'migrate-deps',private:true,dependencies:{'drizzle-orm':v('drizzle-orm'),postgres:v('postgres')}}))" \
    && npm install --omit=dev --no-audit --no-fund

# --- Stage 2: Build the application ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder auth env vars satisfy the fail-loud check in src/lib/auth.ts during
# Next.js static analysis. Real values come from .env at container runtime.
RUN AUTH_OIDC_ISSUER=https://build-placeholder.invalid \
    AUTH_OIDC_CLIENT_ID=build-placeholder \
    AUTH_REQUIRED_GROUP=build-placeholder \
    AUTH_SECRET=build-placeholder \
    npm run build

# --- Stage 3: Production runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migration and seed assets (`node scripts/migrate.mjs`, `node scripts/seed-demo.mjs`),
# to run before starting a new version, from whatever orchestrates the deployment.
# Not used by the app server itself.
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/scripts/migrate.mjs /app/scripts/seed-demo.mjs ./scripts/
COPY --from=build --chown=nextjs:nodejs /app/demo-data/history.json ./demo-data/history.json
COPY --from=build --chown=nextjs:nodejs /app/config ./config
COPY --from=migrate-deps --chown=nextjs:nodejs /deps/build/node_modules ./scripts/node_modules

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
