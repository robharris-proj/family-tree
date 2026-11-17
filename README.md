# Family Atlas

Family Atlas is a Next.js App Router project written in TypeScript. It starts with the Williams GEDCOM sample and supports search, family relationships, profiles, adding people, and saving an updated GEDCOM file.

## Develop locally

Use Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Edit a component and Next.js refreshes it in the browser. Import and save messages appear in the app. Check the browser console for unexpected client errors and the terminal for build or TypeScript errors.

```sh
npm test
npm run typecheck
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Next.js route, metadata, and styles |
| `src/components/family-atlas.tsx` | App shell that connects the views to the tree state |
| `src/components/people-directory.tsx` | Search, selection, and tree actions |
| `src/components/family-tree.tsx` | Family cards and view controls |
| `src/components/person-profile.tsx` | Life events, citations, and relationship links |
| `src/components/person-editor.tsx` | Add-person form and relationship choices |
| `src/components/gedcom-import.tsx` | File picker and drop area |
| `src/hooks/use-family-tree.ts` | Tree state, import, add-person, and save actions |
| `src/lib/` | GEDCOM parsing, record edits, relationships, file saving, and browser storage |
| `src/data/sample.ts` | Bundled sample data |
| `tests/` | GEDCOM and storage regression tests |

## Host on a website

Run `npm run build`, then upload the **contents of `out/`** to the website root, including the `_next/` directory. For a subfolder such as `/family-tree/`, set the base path before building and upload the contents of `out/` into that subfolder.

```sh
NEXT_PUBLIC_BASE_PATH=/family-tree npm run build
```

In PowerShell, use `$env:NEXT_PUBLIC_BASE_PATH='/family-tree'` before running the build. Node.js is needed for development and the build. The resulting site can run on a static web host.

## Keep your tree

**Open GEDCOM** reads the file in your browser. Adding a person updates the browser draft, and **Save GEDCOM** makes a new file with the whole updated tree. Compatible browsers offer Save As. Other browsers download the copy.

Drafts are stored per website origin and browser. To move a tree to a new website or device, first save it from the original app and then open the resulting GEDCOM file in the new app. The included sample is available to anyone who can open the site. Imported trees and additions are browser-local.
