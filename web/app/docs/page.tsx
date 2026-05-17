import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const PACKAGE_ID = '0x21f54aae5eb9a8cfef519e0dd528bbb622a28796f430705a2bdd16893f09a62b';

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-cta" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
      {/* Nav */}
      <nav className="px-4 sm:px-6 py-6 bg-card/30 border-b-4 border-border-strong mb-8 sticky top-0 backdrop-blur-md z-50 shadow-brutal">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl neo-btn-cta text-cta-foreground flex items-center justify-center font-black text-xl shadow-brutal-sm">s</div>
            <span className="font-black text-2xl tracking-tighter lowercase">sonar</span>
            <span className="font-black opacity-20 lowercase text-lg hidden sm:inline">/ docs</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/new" className="neo-btn-cta text-cta-foreground px-6 py-2 text-sm">
              create a form &rarr;
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-20">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl sm:text-6xl mb-4 leading-tight">documentation</h1>
          <p className="text-xl font-bold opacity-60 lowercase leading-tight">
            everything you need to integrate sonar into your sui project.
          </p>
        </div>

        {/* Architecture */}
        <Section id="architecture" title="architecture">
          <p className="text-lg font-bold lowercase leading-tight opacity-70">sonar has no backend database. all data lives on two decentralized layers:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="neo-card bg-accent/10 p-6 shadow-brutal-sm">
              <h3 className="text-xl mb-2">walrus</h3>
              <p className="text-sm font-bold opacity-60 lowercase leading-tight">stores form schemas and submission data as blobs. immutable, content-addressed, globally available.</p>
            </div>
            <div className="neo-card bg-cta/10 p-6 shadow-brutal-sm">
              <h3 className="text-xl mb-2">sui</h3>
              <p className="text-sm font-bold opacity-60 lowercase leading-tight">stores form metadata as shared objects, records submission blob ids via events, and enforces access control via seal.</p>
            </div>
          </div>

          <h3 className="text-2xl mt-12 mb-6">data flow</h3>
          <div className="neo-card bg-card-cream p-6 font-mono text-xs font-bold shadow-none border-dashed overflow-x-auto">
            <div className="opacity-30 mb-2"># creating a form</div>
            <div className="flex items-center gap-3">schema (json) <span className="text-accent text-lg">&rarr;</span> walrus <span className="text-accent text-lg">&rarr;</span> sui object</div>
            <div className="opacity-30 mt-6 mb-2"># submitting a response</div>
            <div className="flex items-center gap-3">response (json) <span className="text-accent text-lg">&rarr;</span> walrus <span className="text-accent text-lg">&rarr;</span> sui event</div>
            <div className="opacity-30 mt-6 mb-2"># reading submissions</div>
            <div className="flex items-center gap-3">query events <span className="text-accent text-lg">&rarr;</span> fetch blobs <span className="text-accent text-lg">&rarr;</span> dashboard</div>
          </div>
        </Section>

        {/* Contracts */}
        <Section id="contracts" title="smart contracts">
          <p className="text-lg font-bold lowercase leading-tight opacity-70 mb-10">three move modules deployed on sui:</p>

          <div className="space-y-12">
            <div>
              <h3 className="text-2xl mb-2">form_registry</h3>
              <p className="text-sm font-bold opacity-50 lowercase mb-4">manages form metadata as shared objects. each form points to its current schema blob on walrus.</p>
              <CodeBlock>{`module sonar::form_registry {
    public struct Form has key, store {
        id: UID,
        owner: address,
        title: String,
        current_blob_id: String,  // Walrus blob ID
        version: u64,
        encrypted: bool,
    }
    public fun create_form(title, blob_id, encrypted, ctx)
    public fun update_form(form, new_blob_id, ctx)
}`}</CodeBlock>
            </div>

            <div>
              <h3 className="text-2xl mb-2">submission_batch</h3>
              <p className="text-sm font-bold opacity-50 lowercase mb-4">records individual submissions and optional merkle batches for tamper-evidence.</p>
              <CodeBlock>{`module sonar::submission_batch {
    public struct SubmissionRecorded has copy, drop {
        form_id: address,
        blob_id: String,      // Walrus blob ID
        submitter: address,
        encrypted: bool,
        form_version: u64,
    }
    public fun record_submission(form_id, blob_id, encrypted, form_version, ctx)
}`}</CodeBlock>
            </div>
          </div>
        </Section>

        {/* Deployed addresses */}
        <Section id="deployed" title="deployed addresses">
          <InfoTable rows={[
            ['Package ID', PACKAGE_ID],
            ['Network', 'Sui Devnet'],
            ['Publisher', 'https://publisher.walrus-testnet.walrus.space'],
            ['Aggregator', 'https://aggregator.walrus-testnet.walrus.space'],
            ['Seal Servers', 'Mysten testnet-1 & testnet-2'],
          ]} />
        </Section>

        {/* Walrus */}
        <Section id="walrus" title="walrus integration">
          <p className="text-lg font-bold lowercase leading-tight opacity-70 mb-6">all data storage uses the walrus http api:</p>
          <CodeBlock>{`// Upload a blob
PUT https://publisher.walrus-testnet.walrus.space/v1/blobs
Content-Type: application/octet-stream
Body: <raw bytes>

// Fetch a blob
GET https://aggregator.walrus-testnet.walrus.space/v1/blobs/<blobId>`}</CodeBlock>

          <h3 className="text-2xl mt-10 mb-6">what we store</h3>
          <div className="grid grid-cols-2 gap-4">
            {['form schemas', 'submissions', 'file uploads', 'merkle batches'].map(item => (
              <div key={item} className="neo-card bg-card p-4 shadow-brutal-sm">
                <span className="text-sm font-black lowercase">{item}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Seal */}
        <Section id="seal" title="seal encryption">
          <p className="text-lg font-bold lowercase leading-tight opacity-70 mb-8">submissions are encrypted client-side before upload:</p>
          <div className="space-y-4">
            {[
              'respondent fills the form and clicks submit',
              'client constructs a seal id with random entropy',
              'data is encrypted locally before leaving the browser',
              'encrypted bytes are uploaded to walrus',
              'only the form owner can decrypt via sui PTB approval',
            ].map((step, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-lg bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center font-black shadow-brutal-sm shrink-0">{i + 1}</div>
                <span className="text-sm font-bold lowercase opacity-70">{step}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Field types */}
        <Section id="fields" title="supported field types">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              'Short text', 'Long text', 'Rich text',
              'Dropdown', 'Multi-select', 'Checkboxes',
              'Radio', 'Star rating', 'Number',
              'URL', 'Email', 'Date',
              'Image upload', 'Video upload', 'File upload',
              'Section header', 'Description block',
            ].map((f) => (
              <div key={f} className="neo-card bg-card px-4 py-3 font-black text-xs lowercase shadow-brutal-sm hover:bg-accent transition-colors cursor-default">{f}</div>
            ))}
          </div>
        </Section>

        {/* Limitations */}
        <Section id="limitations" title="honest limitations">
          <div className="neo-card bg-info p-8 border-border-strong shadow-brutal">
            <ul className="space-y-4">
              {[
                'we cannot pin a blob to a specific country on walrus.',
                'seal key servers run in known jurisdictions.',
                'GDPR erasure is handled via crypto-shredding (key destruction).',
                'walrus testnet blobs may be garbage-collected after expiry.',
              ].map((lim, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="text-accent text-lg font-black">&bull;</span>
                  <span className="text-sm font-bold text-info-foreground/80 lowercase leading-tight">{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-border-strong bg-card px-6 py-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 font-black lowercase">
            <div className="w-8 h-8 rounded-lg bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center shadow-brutal-sm">s</div>
            <span>sonar</span>
          </div>
          <Link href="/" className="neo-btn bg-accent px-6 py-2 text-xs">back home</Link>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-20">
      <div className="neo-card bg-card p-10 sm:p-14 shadow-brutal-lg">
        <h2 className="text-4xl mb-8 scroll-mt-32">{title}</h2>
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="neo-card bg-card-cream p-6 overflow-x-auto text-xs font-mono font-bold text-foreground/50 shadow-none border-dashed">
      {children}
    </pre>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="neo-card bg-card-cream overflow-hidden shadow-none border-border-strong/10">
      {rows.map(([label, value], i) => (
        <div key={label} className={`flex flex-col sm:flex-row gap-2 sm:gap-6 px-6 py-4 ${i !== rows.length - 1 ? 'border-b-2 border-border-strong/5' : ''}`}>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-30 w-32 shrink-0">{label}</span>
          <code className="text-xs font-mono font-bold text-accent break-all">{value}</code>
        </div>
      ))}
    </div>
  );
}
