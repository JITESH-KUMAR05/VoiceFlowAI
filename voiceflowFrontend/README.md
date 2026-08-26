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
npm run lint
npx tsc --noEmit
npm run build
```

## Layout

| Path              | Contents                                                  |
| ----------------- | --------------------------------------------------------- |
| `src/lib/api.ts`  | Every backend call. The only module that reads the API URL |
| `src/components/ui/` | shadcn primitives — edit only to change design tokens   |
| `src/components/` | Feature components, grouped by domain                      |
| `src/pages/`      | Route components, one directory per agent persona          |
| `src/index.css`   | Design tokens for both themes                              |

Design constraints for this codebase are in [`../CLAUDE.md`](../CLAUDE.md).
