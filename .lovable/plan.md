# JavaScript/JSX migration and database completion

## 1. Migrate app source
- Convert the application files under `src/` from `.ts`/`.tsx` to `.js`/`.jsx`.
- Remove TypeScript-only annotations, interfaces, type imports, assertions, and generics while preserving runtime logic, TanStack Start routing, auth, location, payments, owner tools, and UI behavior.
- Keep required project/tooling and generated integration files intact where the platform owns them, while updating imports and route discovery so every referenced module resolves.

## 2. Complete the database safely
- Compare the current database tables with the app’s actual data requirements.
- Add only missing tables/columns needed by the existing application; do not reset or delete current data.
- Use one approved database migration with explicit grants before RLS policies for every new public table, and keep existing security rules intact.

## 3. Verify
- Regenerate/validate the TanStack route tree through the normal build.
- Check the newest build diagnostics and confirm the preview loads without runtime errors.
- Re-read the roadmap and report the converted files and any database additions clearly.
