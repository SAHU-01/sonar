# Sonar — Build Context

## What we're building
Sonar is a general-purpose feedback platform on Sui + Walrus + Seal. The feedback layer for Sui. Any project drops it in for bug reports, feature requests, surveys, applications, or any structured input. Submissions store on Walrus, optionally encrypted via Seal. We win the Walrus Sessions 2 — Form Tooling hackathon (deadline May 18, 2026; today is May 13).

The product is Typeform / Google Forms grade. Polished, fast, professional. The Walrus + Seal layer makes submissions tamper-evident, owner-portable, and globally compliance-ready as a built-in feature — not the headline. Lead pitch: "the feedback layer for Sui." Compliance is a credibility booster.

## Architecture — LOCKED. Do not deviate.

1. Submissions queue in Postgres, batched to Walrus every 10 minutes (one blob = N submissions, Merkle-rooted, one Sui PTB per batch). Respondents NEVER wait for a Sui transaction.
2. Form schemas are Walrus blobs, referenced by Sui FormRegistry shared objects. Shareable links use the Sui object ID (mutable pointer), not blob IDs. Forms are versioned: editing creates a new schema blob, the FormRegistry points to the latest.
3. Seal encryption is a per-form toggle. Default policy: owner-only decryption via `policy_owner_only::seal_approve`. Power users can attach custom policies — ship timelock, allowlist, retention as documented examples.
4. The `id` passed to `SealClient.encrypt()` MUST byte-match what `seal_approve` decodes via BCS. Test end-to-end Day 1 before building anything else.
5. File uploads (images, videos, attachments) go directly from the browser to the Walrus publisher; the blob ID is stored in the submission JSON.
6. NO custom Sui indexer framework. Poll events with `@mysten/sui`.
7. All form validation is Zod-based on both client and server. Schemas serialize to JSON for storage on Walrus and deserialize back to Zod schemas at runtime.

## Stack — LOCKED

- Sui Move (devnet for build, testnet for final demo)
- `@mysten/seal`, `@mysten/sui`, `@mysten/dapp-kit`
- Walrus testnet HTTP API (publisher + aggregator)
- Next.js 15 App Router + TypeScript (strict mode)
- Tailwind + shadcn/ui (use shadcn Data Table for the dashboard, Sonner for toasts)
- Postgres via Neon serverless (or local Docker for dev)
- Drizzle ORM (lightweight, TypeScript-first)
- Zod for all validation, schema definition, and form field rules
- `react-hook-form` + `@hookform/resolvers/zod` for the form builder and renderer
- `@tanstack/react-table` (the underlying lib for shadcn Data Table)
- `recharts` for the analytics dashboard
- `@noble/hashes` for Merkle trees
- `date-fns` for date handling
- Render or Railway for the background worker (NOT Vercel cron — too unreliable for 10-min intervals)
- Walrus Sites for the landing page and demo video host

## Feature spec — the build target

### 1. Form Builder (the Typeform/Google Forms replacement)

A drag-and-drop builder at `/new` and `/edit/[formId]`. Left panel: field palette. Center: live preview. Right panel: properties for selected field.

**Field types (all required):**
- Short text
- Long text (textarea)
- Rich text (markdown editor, use `@uiw/react-md-editor`)
- Dropdown (single select)
- Multi-select
- Checkboxes (multiple values)
- Radio (single value)
- Star rating (1-5, configurable to 1-10)
- Number (with min/max)
- URL
- Email
- Date
- Image upload (jpg, png, webp; configurable max size, default 5MB)
- Video upload (mp4, webm; max 10MB)
- File upload (any type; max 10MB)
- Section header (display-only, for grouping)
- Description block (display-only markdown)

**Per-field properties:**
- Label
- Help text
- Placeholder
- Required toggle
- Default value
- Validation rules (Zod-based, see below)
- Conditional show/hide (show this field only if another field equals X)

**Per-field Zod validation — user-configurable in the builder UI:**
The builder lets the user click "Add validation rule" on any field and pick from:
- Min length / max length (text fields)
- Min value / max value (number, rating)
- Regex match (text, URL, email) — with a friendly preset library (phone numbers, postal codes, etc.)
- Custom error message
- File type restrictions (uploads)
- Min file size / max file size (uploads)
- Required only if [other field condition]

Internally these compile to a Zod schema. Store the validation config as JSON in the form schema; reconstruct the Zod schema at render time.

**Form-level settings:**
- Title, description, banner image
- Success message, redirect URL on submit
- Submission limit: per-wallet (requires wallet connect) or open
- Close date (form stops accepting after)
- Access control: public, wallet-gated, NFT-gated, allowlist
- Branding: logo, accent color
- Encryption toggle (default off)
- Custom slug for shareable URL

**Builder UX must include:**
- Drag-and-drop reordering of fields
- Field duplication
- Field deletion with confirmation
- Live preview pane (toggles between desktop and mobile view)
- Save draft / publish flow
- Form versioning (every publish creates a new version; old versions remain readable)
- Undo/redo

### 2. Form Renderer (`/f/[formId]`)

The page respondents see. Public — no wallet needed for public forms; wallet connect appears only for wallet-gated forms.

- Renders the form schema fetched from Walrus
- Uses `react-hook-form` + Zod resolver for all validation
- Shows real-time validation as user types
- File uploads go directly to Walrus publisher with progress indicators
- On submit: client-side encrypt if form is encrypted, POST to `/api/submission`, show success message
- Mobile-first responsive
- Supports embedding (`?embed=true` strips chrome for iframe use)

### 3. Admin Dashboard (`/admin/[formId]`)

The dashboard is split into three tabs:

**Tab 1: Responses**
- shadcn Data Table powered by `@tanstack/react-table`
- Columns: timestamp, submitter (if known), each form field, tags, status (new / reviewed / resolved)
- Filters: date range, has-screenshot, has-video, rating range, by field value, by tag, by status
- Full-text search across all text fields
- Sort by any column
- Bulk operations: mark resolved, delete, tag, export selected as CSV
- Row click: opens response detail drawer with full submission, files, admin notes (threaded), status changes, audit log
- CSV export with optional "include Merkle proofs" toggle for verifiable exports
- JSON export

**Tab 2: Analytics**
This is the part that goes beyond Typeform's free tier and is a genuine differentiator. Use `recharts`.

- Top stats cards: total submissions, submissions today, completion rate, avg time to complete
- Submissions over time (line chart, configurable range: 24h, 7d, 30d, all)
- Field-by-field breakdowns:
  - For star ratings: distribution histogram + average
  - For dropdowns / radio / checkboxes: bar chart of option frequency
  - For text fields: word cloud or top phrases (use simple frequency counting, no ML needed)
  - For uploads: count, total size
- Drop-off funnel: which field do respondents abandon at? (We track this via partial submissions written to localStorage and a beacon API on field-by-field blur.)
- Geographic distribution: if IP geolocation is enabled (off by default, opt-in per form), show a world map of where submissions came from. Use respondent self-attested country at form-level instead, by default.
- Device breakdown: desktop / mobile / tablet (from user agent)
- Export analytics as PDF report

**Tab 3: Settings**
- Form metadata edit
- Versioning history (list of all schema versions with diff view)
- Access control rules
- Encryption status (toggle requires re-deploying form due to policy binding)
- Webhook URL (optional: POST to URL on each submission — Web2-style integration)
- API key for programmatic submission fetch
- Danger zone: archive form, delete form (Sui object archived; blobs persist)

### 4. Verification page (`/verify/[formId]`)

Public, anyone can visit.
- Shows form's current Merkle root from Sui
- Shows total submission count
- Paste-a-hash inclusion verifier with proof export
- "Why this matters" copy explaining tamper-evidence

### 5. Marketing landing page (`/`)

Hosted on both Vercel and Walrus Sites. Sections:
- Hero: "The feedback layer for Sui." CTA: "Create a form" (no signup, just connect wallet).
- 3-up feature grid: Tamper-evident, Encryption-ready, Own your data
- Demo embed: a live Sonar form asking "What feedback platform features do you wish existed?"
- Trusted by: logos of Sui projects (placeholder until real)
- Compliance section: short explainer that encryption + access control via Seal handles GDPR / DPDP / PIPL essentials
- Footer with docs, GitHub, X

## Repo structure

```
sonar/
├── CLAUDE.md
├── README.md
├── .env.example
├── docs/
│   ├── PLAN.md
│   ├── DAY1_VERIFICATION.md
│   ├── BLOCKERS.md
│   └── ARCHITECTURE.md
├── move/
│   ├── Move.toml
│   └── sources/
│       ├── form_registry.move
│       ├── submission_batch.move
│       ├── policy_owner_only.move
│       ├── policy_timelock.move          (example)
│       ├── policy_allowlist.move         (example)
│       └── policy_retention.move         (example)
├── web/                                  (Next.js 15)
│   ├── app/
│   │   ├── (marketing)/page.tsx
│   │   ├── new/page.tsx                  (form builder)
│   │   ├── edit/[formId]/page.tsx
│   │   ├── f/[formId]/page.tsx           (respondent view)
│   │   ├── admin/[formId]/page.tsx       (dashboard)
│   │   ├── verify/[formId]/page.tsx
│   │   └── api/
│   │       ├── form/route.ts
│   │       ├── submission/route.ts
│   │       ├── upload/route.ts
│   │       └── analytics/[formId]/route.ts
│   ├── components/
│   │   ├── builder/
│   │   ├── renderer/
│   │   ├── dashboard/
│   │   ├── verify/
│   │   └── ui/                           (shadcn components)
│   ├── lib/
│   │   ├── sui.ts
│   │   ├── seal.ts
│   │   ├── walrus.ts
│   │   ├── merkle.ts
│   │   ├── db.ts
│   │   ├── zod-builder.ts
│   │   └── analytics.ts
│   ├── drizzle/
│   │   ├── schema.ts
│   │   └── migrations/
│   └── package.json
├── worker/
│   ├── src/
│   │   ├── batcher.ts
│   │   ├── indexer.ts
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
└── shared/
    └── schema.ts
```

## Zod schema for the form schema itself (shared/schema.ts)

```typescript
import { z } from 'zod';

export const ValidationRuleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('minLength'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('maxLength'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('min'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('max'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('regex'), pattern: z.string(), message: z.string().optional() }),
  z.object({ type: z.literal('email'), message: z.string().optional() }),
  z.object({ type: z.literal('url'), message: z.string().optional() }),
  z.object({ type: z.literal('fileType'), allowed: z.array(z.string()), message: z.string().optional() }),
  z.object({ type: z.literal('maxFileSize'), bytes: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('requiredIf'), fieldId: z.string(), equals: z.unknown(), message: z.string().optional() }),
]);

export const FieldTypeSchema = z.enum([
  'short_text', 'long_text', 'rich_text', 'dropdown', 'multi_select',
  'checkboxes', 'radio', 'star_rating', 'number', 'url', 'email', 'date',
  'image_upload', 'video_upload', 'file_upload', 'section_header', 'description_block',
]);

export const FormFieldSchema = z.object({
  id: z.string(),
  type: FieldTypeSchema,
  label: z.string(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  options: z.array(z.string()).optional(),
  validations: z.array(ValidationRuleSchema).default([]),
  conditional: z.object({ fieldId: z.string(), equals: z.unknown() }).optional(),
  config: z.record(z.unknown()).optional(),
});

export const FormSchema = z.object({
  version: z.number(),
  title: z.string(),
  description: z.string().optional(),
  bannerImageBlobId: z.string().optional(),
  fields: z.array(FormFieldSchema),
  successMessage: z.string().default('Thanks for your submission!'),
  redirectUrl: z.string().url().optional(),
  submissionLimit: z.enum(['per_wallet', 'open']).default('open'),
  closeDate: z.string().datetime().optional(),
  accessControl: z.object({
    type: z.enum(['public', 'wallet_gated', 'nft_gated', 'allowlist']),
    value: z.string().optional(),
  }).default({ type: 'public' }),
  branding: z.object({
    logoBlobId: z.string().optional(),
    accentColor: z.string().optional(),
  }).optional(),
  encryption: z.object({
    enabled: z.boolean().default(false),
    policyPackageId: z.string().optional(),
    policyModule: z.string().optional(),
  }).default({ enabled: false }),
});

export type FormField = z.infer<typeof FormFieldSchema>;
export type FormSchemaType = z.infer<typeof FormSchema>;
```

## Postgres schema (Drizzle)

Same as the previous spec — forms, submissions, batches, admin_notes, tags, submission_tags — plus add:

```typescript
export const analytics_events = pgTable('analytics_events', {
  id: uuid().primaryKey().defaultRandom(),
  formId: uuid().references(() => forms.id),
  eventType: text(),
  fieldId: text(),
  sessionId: text(),
  device: text(),
  country: text(),
  timestamp: timestamp().defaultNow(),
});
```

## Day-by-day plan

Today is May 13, deadline May 18. Six days.

### Day 1 — May 13 (TODAY)
- Monorepo scaffold (turborepo or pnpm workspaces): /move, /web, /worker, /shared
- Sui devnet wallet funded
- Walrus testnet WAL faucet
- Walrus blob upload + fetch round-trip working (write a script)
- Sui Move package skeleton deployed (just `form_registry` with create_form stub)
- Seal SDK encrypt + decrypt round-trip with trivial seal_approve that returns true — CRITICAL Day 1 check
- Postgres + Drizzle schema first draft
- Throwaway 30-sec video uploaded to Walrus
- Allowlist request to Mysten testnet Seal key servers if required
- Shared Zod schema written

### Day 2 — May 14
- Complete Move package: form_registry, submission_batch, policy_owner_only
- Form builder UI: field palette, drag-and-drop canvas, properties panel, preview pane
- All field types render in preview
- Validation rule editor UI
- Save flow: form schema -> Zod-validate -> upload to Walrus -> Sui PTB -> form created

### Day 3 — May 15
- Form renderer: react-hook-form + Zod resolver, all field types working
- File upload to Walrus from browser with progress
- Submission API + Postgres queue
- Batcher worker: queue -> Walrus blob -> Sui PTB -> Merkle root committed
- Public-mode end-to-end
- Encrypted-mode end-to-end
- Indexer worker polling Sui events

### Day 4 — May 16
- Admin dashboard: Responses tab with shadcn Data Table
- Filters, search, sort, tags, bulk ops, CSV export
- Response detail drawer with admin notes
- Analytics tab with all charts (recharts)
- Settings tab
- Verification page
- MILESTONE: feature-complete by EOD

### Day 5 — May 17
- Polish UX everywhere, fix every visible bug
- Marketing landing page
- Deploy: web on Vercel, worker on Render
- Walrus Sites deployment for landing page mirror
- Create real "Sonar feedback for Walrus Sessions" form
- Distribute
- Target: 25-50 real submissions before midnight

### Day 6 — May 18
- Record final demo video (under 3 min)
- Upload demo to Walrus
- Submit via Airtable
- README polish, repo cleanup
- Launch posts

## Day 1 verification checklist — DO THESE FIRST

Before building any product code, verify these and write findings to `/docs/DAY1_VERIFICATION.md`:

1. **Mysten testnet Seal key server allowlisting.** Does it require pre-approval of our Move package ID? If yes, submit the request via Seal Discord IMMEDIATELY. Document the response.

2. **Walrus publisher rate limits and max file size from a browser POST.** Test with a 10MB video upload from a `fetch` call. Document the limits.

3. **`@mysten/dapp-kit` + Next.js 15 App Router compatibility.** Verify the client/server component split pattern works. Document the working pattern.

4. **PTB pattern for batched commit.** Write a minimal working PTB that calls `submission_batch::commit_batch` updating Merkle root + emitting an event. Document the working PTB.

5. **End-to-end Seal flow.** Run `SealClient.encrypt -> store on Walrus -> SessionKey signing -> seal_approve dry-run -> SealClient.decrypt` round-trip in our own code, with a trivial seal_approve that returns true. The BCS encoding of the `id` parameter must match between encrypt and decrypt. Document the exact pattern that works.

If any check fails, write the blocker to `/docs/BLOCKERS.md` before continuing with other work.

## Honest limitations to document in README

- We cannot deterministically pin a blob to a specific country, only honestly visualize where shards currently live (via Walruscan).
- Seal key servers run in known jurisdictions; we display them, we do not operate them.
- Crypto-shredding via Seal key destruction is the GDPR Article 17 erasure mechanism we recommend, not Walrus blob deletion.
- Post-decryption use cannot be enforced by the protocol; we anchor audit logs of decryption attempts on Sui.
- Form versioning means edits create new schema versions; previous versions remain readable. Submissions are tagged with the form version they answered.

## Working agreements

- Commit to git every 30 minutes. Never let uncommitted work exceed 1 hour.
- Persist findings to `/docs/` as you go.
- If you hit a blocker that needs a human decision, write to `/docs/BLOCKERS.md` and continue with the next independent task.
- If a Day 1 verification check fails, STOP and write to BLOCKERS.md before continuing.
- Prefer the boring choice. We are not refactoring or experimenting with new tech mid-build.
- Keep secrets in `.env` (gitignored). Use `.env.example` with placeholders.
- For Move package upgrades: use versioned shared objects per Seal docs best practice.
- Run `pnpm typecheck` and `pnpm lint` before every commit.
- When you create a new component or module, write a one-paragraph header comment explaining what it does and what it depends on.

## Environment variables (.env.example)

```
DATABASE_URL=postgres://localhost:5432/sonar
SUI_NETWORK=devnet
SUI_PRIVATE_KEY=ed25519...
SUI_PACKAGE_ID=0x...
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
SEAL_KEY_SERVER_IDS=0x...,0x...
SEAL_THRESHOLD=2
NEXT_PUBLIC_SUI_NETWORK=devnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## First-message kickoff

Read this entire file. Then start Day 1. Verify each item in the Day 1 verification checklist before writing product code. Commit every 30 minutes. Persist findings to /docs. Begin.
