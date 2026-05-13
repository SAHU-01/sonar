import Link from 'next/link';

const PACKAGE_ID = '0x21f54aae5eb9a8cfef519e0dd528bbb622a28796f430705a2bdd16893f09a62b';

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs">S</div>
            <span className="font-semibold tracking-tight">Sonar</span>
            <span className="text-muted-foreground text-sm ml-1">/ docs</span>
          </Link>
          <Link href="/new" className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Create a form
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Documentation</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to integrate Sonar into your Sui project.
          </p>
        </div>

        {/* Architecture */}
        <Section id="architecture" title="Architecture">
          <p>Sonar has no backend database. All data lives on two decentralized layers:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong>Walrus</strong> — Stores form schemas and submission data as blobs. Immutable, content-addressed, globally available.</li>
            <li><strong>Sui</strong> — Stores form metadata as shared objects, records submission blob IDs via events, and enforces access control for encrypted forms via Seal.</li>
          </ul>

          <h3 className="font-semibold mt-8 mb-3">Data flow</h3>
          <div className="bg-card border border-border rounded-xl p-5 font-mono text-sm leading-relaxed">
            <div className="text-muted-foreground">{'// Creating a form'}</div>
            <div>Form schema (JSON) <span className="text-accent">→</span> Walrus blob <span className="text-accent">→</span> blob ID</div>
            <div>blob ID + title <span className="text-accent">→</span> Sui PTB <span className="text-accent">→</span> FormRegistry shared object</div>
            <div className="mt-4 text-muted-foreground">{'// Submitting a response'}</div>
            <div>Response (JSON) <span className="text-accent">→</span> Walrus blob <span className="text-accent">→</span> blob ID</div>
            <div>blob ID + form ID <span className="text-accent">→</span> Sui PTB <span className="text-accent">→</span> SubmissionRecorded event</div>
            <div className="mt-4 text-muted-foreground">{'// Reading submissions (admin dashboard)'}</div>
            <div>Query Sui events by form ID <span className="text-accent">→</span> list of blob IDs</div>
            <div>Fetch each blob from Walrus <span className="text-accent">→</span> submission data</div>
          </div>
        </Section>

        {/* Contracts */}
        <Section id="contracts" title="Smart contracts">
          <p>Three Move modules deployed on Sui:</p>

          <h3 className="font-semibold mt-6 mb-2">form_registry</h3>
          <p className="text-muted-foreground text-sm mb-3">Manages form metadata as shared objects. Each form points to its current schema blob on Walrus.</p>
          <CodeBlock>{`module sonar::form_registry {
    // Shared object — one per form
    public struct Form has key, store {
        id: UID,
        owner: address,
        title: String,
        current_blob_id: String,  // Walrus blob ID
        version: u64,
        encrypted: bool,
    }

    // Create a form (anyone can call)
    public fun create_form(title, blob_id, encrypted, ctx)

    // Update schema (owner only)
    public fun update_form(form, new_blob_id, ctx)
}`}</CodeBlock>

          <h3 className="font-semibold mt-6 mb-2">submission_batch</h3>
          <p className="text-muted-foreground text-sm mb-3">Records individual submissions and optional Merkle batches for tamper-evidence.</p>
          <CodeBlock>{`module sonar::submission_batch {
    // Emitted per submission — this IS the index
    public struct SubmissionRecorded has copy, drop {
        form_id: address,
        blob_id: String,      // Walrus blob ID
        submitter: address,
        encrypted: bool,
        form_version: u64,
    }

    // Record a submission (stores blob ID on-chain)
    public fun record_submission(form_id, blob_id, encrypted, form_version, ctx)
}`}</CodeBlock>

          <h3 className="font-semibold mt-6 mb-2">policy_owner_only</h3>
          <p className="text-muted-foreground text-sm mb-3">Seal encryption policy. Key servers call this to verify decryption access.</p>
          <CodeBlock>{`module sonar::policy_owner_only {
    // Called by Seal key servers via dry_run
    // Verifies: (1) id starts with form object ID bytes
    //           (2) caller is the form owner
    entry fun seal_approve(id: vector<u8>, form: &Form, ctx: &TxContext)
}`}</CodeBlock>
        </Section>

        {/* Deployed addresses */}
        <Section id="deployed" title="Deployed addresses">
          <InfoTable rows={[
            ['Package ID', PACKAGE_ID],
            ['Network', 'Sui Devnet (will move to Testnet for final demo)'],
            ['Wallet', '0xd38dea5868b7e74f48be1538f9fc12e7f6fe6b27eef1b7f2edd9bcc5443c0028'],
            ['Walrus Publisher', 'https://publisher.walrus-testnet.walrus.space'],
            ['Walrus Aggregator', 'https://aggregator.walrus-testnet.walrus.space'],
            ['Seal Key Servers', 'Mysten testnet-1 & testnet-2 (Open mode, no allowlisting)'],
          ]} />
        </Section>

        {/* Walrus */}
        <Section id="walrus" title="Walrus integration">
          <p>All data storage uses the Walrus HTTP API:</p>
          <CodeBlock>{`// Upload a blob
PUT https://publisher.walrus-testnet.walrus.space/v1/blobs
Content-Type: application/octet-stream
Body: <raw bytes>

// Response
{ "newlyCreated": { "blobObject": { "blobId": "abc123..." } } }

// Fetch a blob
GET https://aggregator.walrus-testnet.walrus.space/v1/blobs/<blobId>`}</CodeBlock>

          <h3 className="font-semibold mt-6 mb-2">What we store on Walrus</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
            <li><strong>Form schemas</strong> — JSON blobs containing field definitions, validation rules, branding</li>
            <li><strong>Submissions</strong> — JSON blobs containing respondent data (plaintext or Seal-encrypted)</li>
            <li><strong>File uploads</strong> — Images, videos, attachments uploaded directly from the browser</li>
            <li><strong>Merkle batch blobs</strong> — Batches of submission hashes for verification</li>
          </ul>
        </Section>

        {/* Seal */}
        <Section id="seal" title="Seal encryption">
          <p>When encryption is enabled on a form, submissions are encrypted client-side before upload:</p>
          <ol className="list-decimal pl-6 space-y-2 mt-3 text-sm text-muted-foreground">
            <li>Respondent fills the form and clicks submit</li>
            <li>Client constructs a Seal ID: <code className="bg-card px-1.5 py-0.5 rounded text-xs">hex(formObjectId + 5 random bytes)</code></li>
            <li>Client calls <code className="bg-card px-1.5 py-0.5 rounded text-xs">SealClient.encrypt()</code> — data is encrypted before leaving the browser</li>
            <li>Encrypted bytes are uploaded to Walrus, blob ID recorded on Sui</li>
            <li>Only the form owner can decrypt, via <code className="bg-card px-1.5 py-0.5 rounded text-xs">policy_owner_only::seal_approve</code></li>
          </ol>
        </Section>

        {/* Field types */}
        <Section id="fields" title="Supported field types">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {[
              'Short text', 'Long text', 'Rich text (Markdown)',
              'Dropdown', 'Multi-select', 'Checkboxes',
              'Radio', 'Star rating', 'Number',
              'URL', 'Email', 'Date',
              'Image upload', 'Video upload', 'File upload',
              'Section header', 'Description block',
            ].map((f) => (
              <div key={f} className="bg-card border border-border rounded-lg px-3 py-2">{f}</div>
            ))}
          </div>
        </Section>

        {/* Validation */}
        <Section id="validation" title="Zod-powered validation">
          <p>Every field can have validation rules that compile to Zod schemas at runtime:</p>
          <ul className="list-disc pl-6 space-y-1 mt-3 text-sm text-muted-foreground">
            <li>Min/max length (text), min/max value (numbers)</li>
            <li>Regex patterns with preset library (phone, postal code, etc.)</li>
            <li>File type and size restrictions</li>
            <li>Conditional required (required only if another field equals X)</li>
            <li>Custom error messages per rule</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Validation config is stored as JSON in the form schema. The renderer reconstructs Zod schemas at runtime via <code className="bg-card px-1.5 py-0.5 rounded text-xs">zod-builder.ts</code>.
          </p>
        </Section>

        {/* Limitations */}
        <Section id="limitations" title="Honest limitations">
          <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
            <li>We cannot pin a blob to a specific country on Walrus. We display where shards currently live via Walruscan.</li>
            <li>Seal key servers run in known jurisdictions — we display this, we do not operate them.</li>
            <li>GDPR Article 17 erasure is handled via crypto-shredding (Seal key destruction), not Walrus blob deletion.</li>
            <li>Post-decryption data use cannot be enforced by the protocol. We log all decryption attempts on Sui.</li>
            <li>Walrus testnet blobs may be garbage-collected after their storage epoch expires.</li>
          </ul>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8 mt-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>Sonar — Built for Walrus Sessions 2</span>
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16">
      <h2 className="text-2xl font-bold mb-4 scroll-mt-20">{title}</h2>
      <div className="text-sm leading-relaxed text-foreground/90 space-y-2">{children}</div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-card border border-border rounded-xl p-4 overflow-x-auto text-xs font-mono text-muted-foreground mt-3 leading-relaxed">
      {children}
    </pre>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mt-3">
      {rows.map(([label, value], i) => (
        <div key={label} className={`flex flex-col sm:flex-row gap-1 sm:gap-4 px-5 py-3 ${i !== rows.length - 1 ? 'border-b border-border' : ''}`}>
          <span className="text-xs text-muted-foreground w-40 shrink-0 font-medium uppercase tracking-wider">{label}</span>
          <code className="text-sm font-mono break-all">{value}</code>
        </div>
      ))}
    </div>
  );
}
