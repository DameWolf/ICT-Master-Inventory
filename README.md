# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Auto Commit + Push

This workspace includes an auto-sync watcher that commits and pushes changes to your current git branch after 5 seconds of no file edits.

- Run manually: `npm run auto-sync`
- Auto-start in VS Code: `.vscode/tasks.json` includes a background task with `runOn: folderOpen`

Notes:

- It watches the entire repository and ignores folders like `.git`, `node_modules`, `dist`, logs, and `.env*` files.
- Pushes target `origin/<current-branch>`.
- If GitHub authentication is not configured, commits are created locally and push will fail until auth is fixed.

## API Configuration (Env Only)

This project now uses environment variables only for AI and voice API keys.
Do not place real keys in source files.

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_AI_PROVIDER` to one of: `openrouter`, `anthropic`, `gemini`, `openai`.
3. Fill in at least one provider key:
	- `VITE_OPENROUTER_API_KEY`
	- `VITE_ANTHROPIC_API_KEY`
	- `VITE_GEMINI_API_KEY`
	- `VITE_OPENAI_API_KEY`
4. Optional: set model overrides with `VITE_OPENROUTER_MODEL` and `VITE_ANTHROPIC_MODEL`.
5. Optional: enable premium voice with `VITE_ELEVENLABS_API_KEY`.

Security:

- `.env`, `.env.*` are ignored by git in this repository.
- Keep `.env.example` as placeholders only.
