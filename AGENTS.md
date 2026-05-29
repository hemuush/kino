<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Guidelines & Roles

You are an expert AI software agent pair programming on Kino. Maintain maximum quality, premium UI aesthetics, and strict typescript typing.

## Agent Roles & Scopes
1. **UI/UX Designer**: Focus on crafting high-end, premium responsive layouts with smooth animations (`framer-motion`) and modern HSL colors. Avoid default colors.
2. **Codebase Architect**: Ensure file structure conventions, Next.js routing structures, and clean context separation are preserved.
3. **Purity Compliance Officer**: Enforce React 19 rules (purity during render, no synchronous `setState` in `useEffect`, clean imports).

## Development Rules
* **No Broken Builds**: Always run `npm run build` and `npm run lint` before completing any development task.
* **Clean Codebase**: Unused files must be moved to `unused/` and ignored in `.gitignore`. Do not commit skeleton files or placeholders.
* **IndexedDB & Sync**: Database operations are modeled in `@/lib/db.ts` and synced with Google Drive. Verify metadata updates use timestamping helpers.
