# Security policy

## Supported versions

The `main` branch and the latest tagged release receive security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private
vulnerability reporting: [Report a vulnerability](https://github.com/ArteGEIE/production-cost-analyzer/security/advisories/new).

Include what you found, how to reproduce it and the impact you expect. You will get an
acknowledgement within five working days and a status update when the issue is triaged.
We will credit you in the fix's release notes unless you prefer otherwise.

## Scope notes for deployers

- Budgets are personal and commercial data. The application only stores the uploaded PDF
  while a draft is under review and deletes it on publication; drafts older than 24 hours
  are purged. Keep `LOG_LEVEL` at `info` or above in production — `debug` logs excerpts of
  the extracted text.
- `DEMO_MODE=true` is a passwordless login. Never enable it on an instance connected to a
  database that holds real data, and give a demo instance its own `AUTH_SECRET`.
- When OIDC is enabled, the app refuses to start without `AUTH_REQUIRED_GROUP` unless you
  opt out explicitly with `AUTH_OIDC_ALLOW_ANY=true`.
