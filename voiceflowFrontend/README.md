# VoiceFlow AI — Frontend

React + Vite console for the VoiceFlow outbound voice agent. Consumes the
FastAPI backend in [`../backend`](../backend).

## Running

```sh
npm install
cp .env.example .env    # point VITE_API_BASE_URL at your backend
npm run dev             # http://localhost:8080
```

The backend must be running for the call and CRM views to return data.

## Checks

```sh
npm run lint             # eslint
npx tsc -b --force       # typecheck — not tsc --noEmit, see note below
npm run test             # vitest, pure logic only
npm run format:check     # prettier
npm run build            # vite build
```

`tsc -b`, not `tsc --noEmit`. The root `tsconfig.json` sets `"files": []` and
only holds project references, so `--noEmit` there typechecks nothing and
exits 0 regardless of how broken the code is.

## Layout

| Path                    | Contents                                                   |
| ----------------------- | ---------------------------------------------------------- |
| `src/lib/api.ts`        | Every backend call. The only module that reads the API URL |
| `src/lib/status.ts`     | Score bands and status colour, shared across CRM views     |
| `src/hooks/useLeads.ts` | Fetches and aggregates leads for one agent                 |
| `src/components/ui/`    | shadcn primitives — edit only to change design tokens      |
| `src/components/`       | Feature components, grouped by domain                      |
| `src/pages/agent/`      | Screens, parameterised by agent (`b2b` / `real-estate`)    |
| `src/index.css`         | Design tokens for both themes                              |

Design constraints for this codebase are in [`../CLAUDE.md`](../CLAUDE.md).
