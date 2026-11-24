<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- All scoring math lives in src/lib/scoring.ts; CVSS, ThreatGrid risk score and residual risk stay separate functions — never mix them.
- Shared data lives in Lovable Cloud tables (workspaces, workspace_members, assets, activity_log, snapshots); activity_log is written only by DB trigger — keep it immutable.
- Signed-in app pages live under src/routes/_authenticated (ssr:false); the guest demo at /demo uses local state only.
- Server functions go in src/lib/*.functions.ts (src/server/ is import-protected from the client).
- Resolve activity actors from recorded user IDs through src/lib/db.ts; never label missing member profiles as system actions, to avoid false attribution.
- Workspace attachments use private workspace-files storage with workspace/user path prefixes and workspace_files metadata; RLS enforces team access and DB triggers write upload/deletion history.
- Manager removals are persisted privately by a membership deletion trigger and checked by join_workspace under a shared per-member transaction lock, so retained invite codes cannot restore revoked access; voluntary departures remain rejoinable.
- Route all CSV export cells through src/lib/csv.ts formula neutralization before CSV quoting, so shared asset text cannot execute as spreadsheet formulas.
- can_edit_ws must reject user IDs other than auth.uid() before role lookup, so its authenticated callers cannot probe other people's editing access while self-scoped RLS checks still work.
- ws_role must return null for anonymous callers or user IDs other than auth.uid() before reading membership, so role lookups cannot reveal other people's access levels.
<!-- AGENT-MEMORY:END -->
