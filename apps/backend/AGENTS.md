# Backend Addendum

Follow the repository-level `AGENTS.md` first.

## HTTP and Authentication

- Register routes declaratively in `start/routes.ts`; keep public routes
  limited to signup, login, and health checks.
- Validate request data before loading or mutating records. Reuse VineJS
  validators and return the existing API response shapes.
- Apply authentication middleware to user and admin data routes. Add tests for
  both an allowed authenticated request and a denied unauthenticated request
  when changing protected behavior.
- Put behavior shared across controllers in a service. Keep controllers
  responsible for HTTP input and output.

## SQLite and Migrations

- Use Lucid models and migrations for persisted data. Define unique keys and
  foreign-key behavior deliberately.
- Do not edit applied migrations. Generate a new migration for each schema
  change, then verify it against the isolated test database.
- Keep the development database and test database separate. Do not seed demo
  records as part of application startup or production deployment.
- Keep demo seeders deterministic where possible and safe to rerun.

## Tests

- Put API tests in `tests/functional` and unit tests in `tests/unit`.
- Use `testUtils.db()` for migrations and cleanup. Do not connect tests to the
  developer's `tmp/db.sqlite3` file.
- Cover success, validation failure, and authentication denial for changes to
  API behavior.
