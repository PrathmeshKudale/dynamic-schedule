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

## TimeOS architecture
- Scheduling engine is pure TS in src/lib/scheduler (runs server-side for proposals and client-side for dashboard analysis) — deterministic, testable, no AI in constraint solving.
- AI (src/lib/ai.server.ts) only parses text and writes explanations; always Zod-validated with deterministic demo fallback (src/lib/parse.ts).
- Schedule changes are stored as PENDING proposals in schedule_changes and only written to schedule_blocks on explicit Apply.
- tsconfig noUncheckedIndexedAccess/exactOptionalPropertyTypes disabled — regex/tuple-heavy parsing code made them noise.
- Feature modules live in src/lib/<feature>/ (goals, attendance, assistant, whatif, gcal), each with its own *.functions.ts and pure helpers, reusing core helpers exported from timeos.functions.ts — keeps features independent.
- Google Calendar is a per-user read-only import (App User Connector); connection keys stored AES-GCM encrypted in app_user_connections, service-role only.
