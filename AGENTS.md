<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Auth gating: `/equipo` (roster row required) and `/profesor` (profiles.role = professor) are client-only layout routes (`ssr: false`) with `beforeLoad` guards using helpers in `src/lib/session.ts`; students use anonymous sessions and never get a sign-out button — why: anonymous sessions can't be recovered.
- The DB schema comes from the user's `schema.sql`; keep its table/column/function/policy names unchanged — why: later prompts depend on them.
- Professor run admin lives under `/profesor/$runId/*` (layout with submenu); the print page is `/profesor_/$runId/imprimir` outside the shell with its own professor guard — why: printable page without app chrome.
- Round times are entered in America/Santiago and stored UTC via `src/lib/chile-time.ts`; `runs.params` stores only overrides vs `DEFAULT_PARAMS` built by `src/lib/param-overrides.ts` (arrays saved whole) — why: mergeParams replaces arrays entirely.
- Round processing runs in the app server route `/api/public/process-round` (logic in `src/lib/process-round.server.ts`, adapted from the user's Edge Function) instead of a Supabase Edge Function — why: new Edge Functions are not allowed; the cron calls it with the managed cron secret.
- Team result screens share the `team-results` Query DTO and render stored `YearResult` values without recalculating them; projection requires the final round to be processed — why: dashboard, history, and print summary must agree with published results and never reveal future outcomes.
- Class results batch ordinary professor-authorized browser reads and reuse the team panel; demo creation uses existing RLS-authorized inserts with rollback and consecutive time slots — why: no privileged service or duplicate model is needed, and rounds must not overlap.
- Student forms enable editing only after saved-data queries succeed; feedback requires the corresponding processed round to be closed — why: late query responses must not overwrite edits, and teaching answers must remain hidden while teams can submit.
