# Frontend Addendum

Follow the repository-level `AGENTS.md` first.

## Upstream Template and React Patterns

- Keep `satnaing/shadcn-admin` as the primary UI foundation. Preserve its
  existing routes, tables, dialogs, navigation, themes, and accessible
  interactions unless the user asks to change them.
- Reuse the existing shadcn/ui components, feature providers, TanStack Router
  and Query patterns, and API client in `src/lib/api.ts`.
- Keep API-backed state in the feature's existing data hooks or provider. Do
  not introduce a second mock or network layer for a feature already connected
  to the backend.
- Handle loading, empty, error, and mutation states in the existing feature
  surface. Avoid replacing complete template pages to make a narrow change.

## Quality

- Keep TypeScript types explicit at API boundaries and use the existing Zod and
  React Hook Form patterns for forms.
- Add or update Vitest browser tests for user-visible behavior and API state
  handling. Keep selectors accessible and behavior-focused.
- Run frontend lint, format, typecheck, tests, and build for changes that
  affect the frontend.
