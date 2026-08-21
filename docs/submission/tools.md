# Complete list of tools used

## AI
| Tool | Used for |
|---|---|
| **Claude Code** (Anthropic, Opus) | The primary build tool. Schema design, the matching function, every screen, the two verification suites, and the docs — written in-editor with Claude Code throughout. Challenge tool selection: Claude API credits. |

Lovable was not used.

## Framework and language
| Tool | Version | Used for |
|---|---|---|
| Next.js (App Router) | 16.3.1 | Framework — Server Components, server actions, route handlers |
| React | 19.2.8 | UI |
| React DOM | 19.2.8 | UI |
| TypeScript | 5.x | Language; DB types generated, not hand-written |
| Node.js | 20+ | Runtime and the verification scripts |

## Styling
| Tool | Version | Used for |
|---|---|---|
| Tailwind CSS | v4 | All styling. CSS-first — design tokens live in an `@theme` block in `globals.css` |
| @tailwindcss/postcss | v4 | Tailwind's PostCSS plugin |
| PostCSS | bundled | Build step |
| next/font — Geist, Geist Mono | bundled | Typeface, self-hosted at build time |

## Backend
| Tool | Used for |
|---|---|
| **Supabase Postgres** | Database. `claim_item` / `confirm_claim` / `confirm_handoff` functions, row-level security on all seven tables, unique partial index enforcing one active reservation per item |
| **Supabase Auth** | Six-digit email OTP sign-in, any institutional domain |
| **Supabase Storage** | The `item-photos` bucket |
| `pg_cron` | Sweeps lapsed reservations every minute |
| @supabase/supabase-js ^2.112.3 | Client library |
| @supabase/ssr ^0.12.4 | Cookie-based sessions across Server Components |
| Supabase CLI (via `npx`, never installed) | Local stack, `db reset`, type generation |
| Docker Desktop | Runs the local Supabase stack |
| Mailpit (in the local stack) | Captures sign-in emails locally — no real mail is ever sent in development |

## Hosting
| Tool | Used for |
|---|---|
| **Vercel** | Hosting, and a daily Cron hitting `/api/maintenance` as a cleanup backstop |

## Tooling
| Tool | Version | Used for |
|---|---|---|
| ESLint | 9 | Linting |
| eslint-config-next | 16.3.1 | Next.js lint rules |
| Git | — | Version control; 22 commits dated Aug 14–21, inside the challenge window |
| GitHub | — | Remote — github.com/kanishkachandrakar/passdown |
| Visual Studio Code | — | Editor |

## Written for this project (not dependencies)
| Script | What it does |
|---|---|
| `scripts/verify-loop.mjs` | 67 checks against real Postgres, including 10 rounds of 12 simultaneous claims |
| `scripts/verify-ui.mjs` | 65 checks against the rendered screens, signed in as a real student |
| `scripts/seed-demo.mjs` | Sample listings for a fresh local install (labelled in the UI; never run on a deployment) |
| `scripts/screenshot-setup.mjs` | Builds a realistic mid-loop campus for filming |

## Assets
| Asset | Source |
|---|---|
| Sample listing photographs (12) | Wikimedia Commons, mostly CC BY-SA — every one credited by file, author and licence in `docs/photo-credits.md`. Used only on sample listings, which a real deployment never creates. |

## Runtime dependency count

Five: `next`, `react`, `react-dom`, and the two Supabase packages. No UI kit, no
component library, no state library, no ORM, no icon package.
