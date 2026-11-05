# claude-react-starter

A minimal, reusable starter for React frontend projects.

## Stack

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) — all components installed as source in `src/components/ui`
- [Lucide](https://lucide.dev/) icons

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — lint with oxlint
- `npm run preview` — preview the production build

## Adding more shadcn/ui components

This project already includes every component from the shadcn/ui registry. To re-sync or add new ones as the registry evolves:

```bash
npx shadcn@latest add <component>
```

## Import alias

`@/*` resolves to `src/*` (configured in `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts`).

## Notes

This repository is intentionally free of application-specific UI (no dashboards, landing pages, navbars, etc.). It's meant to serve as a neutral component foundation for future projects.
