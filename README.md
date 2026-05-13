# Sonar — The Feedback Layer for Sui

Sonar is a general-purpose feedback platform built on Sui, Walrus, and Seal. Drop it into any Sui project for bug reports, feature requests, surveys, applications, or any structured input. Submissions are stored on Walrus, optionally encrypted via Seal, and tamper-evident by default.

**Built for Walrus Sessions 2 — Form Tooling track.**

## Architecture

No database. Everything lives on two decentralized layers:

- **Walrus** — Stores form schemas and submission data as immutable blobs
- **Sui** — Stores form metadata as shared objects, records submission blob IDs via events, enforces access control via Seal

```
Create form:   Schema JSON → Walrus blob → Sui FormRegistry object
Submit:         Response JSON → Walrus blob → Sui SubmissionRecorded event
Read:           Query Sui events → fetch blobs from Walrus
```

## Deployed Contracts

| Item | Value |
|------|-------|
| Package ID | `0x21f54aae5eb9a8cfef519e0dd528bbb622a28796f430705a2bdd16893f09a62b` |
| Network | Sui Devnet |
| Modules | `form_registry`, `submission_batch`, `policy_owner_only` |
| Walrus Publisher | `publisher.walrus-testnet.walrus.space` |
| Walrus Aggregator | `aggregator.walrus-testnet.walrus.space` |
| Seal Key Servers | Mysten testnet-1 & testnet-2 (Open mode) |

## Features

- **Form Builder** — 17 field types, Zod-powered validation, drag-and-drop reorder
- **Form Renderer** — react-hook-form + Zod resolver, file uploads to Walrus, conditional fields
- **Admin Dashboard** — responses table, analytics (recharts), response detail drawer, CSV/JSON export
- **Verification Page** — on-chain event log, Walrus blob links for independent verification
- **Seal Encryption** — per-form toggle, client-side encrypt before upload, owner-only decrypt
- **API Routes** — `GET /api/form`, `POST /api/submission` for programmatic access

## Stack

- Sui Move (devnet)
- `@mysten/sui` v2, `@mysten/seal`, `@mysten/dapp-kit`
- Walrus testnet HTTP API
- Next.js 16 App Router + TypeScript (strict)
- Tailwind CSS + shadcn/ui patterns
- react-hook-form + Zod
- recharts

## Getting Started

```bash
# Prerequisites: Node.js 20+, Sui CLI
git clone <repo>
cd sonar
npm install
npm run dev
```

Visit `http://localhost:3000`. Connect a Sui wallet to create forms.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/docs` | Documentation |
| `/new` | Form builder |
| `/edit/[formId]` | Edit existing form |
| `/f/[formId]` | Respondent view |
| `/f/[formId]?embed=true` | Embeddable iframe |
| `/admin/[formId]` | Admin dashboard |
| `/verify/[formId]` | Verification page |

## Honest Limitations

- Walrus blobs cannot be pinned to specific countries — we display shard locations via Walruscan
- Seal key servers run in known jurisdictions; we display this, we do not operate them
- GDPR Article 17 erasure via crypto-shredding (Seal key destruction), not blob deletion
- Post-decryption data use cannot be enforced by the protocol
- Walrus testnet blobs may expire after their storage epoch

## License

MIT
