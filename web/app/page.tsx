import Link from 'next/link';

const PACKAGE_ID = '0xed8dbdc6ba2f8646485a0f3d3a6e55cd2d449c15aac22c67f225c21b40cd63e1';
const FORM_OBJECT_ID = '0x56c23284381b7da74dd22bc1f1beb649b770352819ed719e06cb4c6a562ca96f';

const features = [
  {
    title: 'Tamper-evident',
    description: 'Every submission is stored on Walrus and indexed via Sui events. Merkle roots committed on-chain make bulk tampering detectable.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Encryption-ready',
    description: 'Toggle per-form encryption powered by Seal. Responses are encrypted client-side before touching any server. Only the form owner decrypts.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'Own your data',
    description: 'No vendor lock-in. Your form schemas and submissions live on Walrus — a decentralized storage network. Export anytime, or read directly on-chain.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
];

const contracts = [
  { label: 'Package ID', value: PACKAGE_ID },
  { label: 'Network', value: 'Sui Devnet' },
  { label: 'Modules', value: 'form_registry, submission_batch, policy_owner_only' },
  { label: 'Demo Form', value: FORM_OBJECT_ID },
  { label: 'Walrus Publisher', value: 'publisher.walrus-testnet.walrus.space' },
  { label: 'Walrus Aggregator', value: 'aggregator.walrus-testnet.walrus.space' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-semibold text-lg tracking-tight">Sonar</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <a href="https://github.com" className="hover:text-foreground transition-colors">GitHub</a>
            <Link href="/new" className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Create a form
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live on Sui Devnet + Walrus Testnet
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            The feedback layer<br />
            <span className="text-accent">for Sui.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Drop-in feedback forms for any Sui project. Bug reports, feature requests, surveys, applications.
            Submissions stored on Walrus. Optionally encrypted via Seal. Tamper-evident by default.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/new" className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Create a form
            </Link>
            <Link href="/docs" className="border border-border hover:border-muted-foreground px-6 py-3 rounded-lg font-medium transition-colors">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-12 text-center">How it works</h2>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Create a form', desc: 'Use the builder to design your form with 17 field types and Zod-powered validation. The schema is uploaded to Walrus and registered on Sui.' },
              { step: '2', title: 'Share the link', desc: 'Each form gets a shareable URL using its Sui object ID. Public forms need no wallet — respondents just fill and submit.' },
              { step: '3', title: 'Submissions go to Walrus', desc: 'Each response is stored as a blob on Walrus. The blob ID is recorded on Sui via a SubmissionRecorded event. No database, no middleman.' },
              { step: '4', title: 'View on the dashboard', desc: 'The admin dashboard reads Sui events to find all submissions, fetches them from Walrus, and displays analytics — all client-side.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contracts */}
      <section className="px-6 py-20 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-center">On-chain details</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">All contracts and infrastructure are live and verifiable.</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {contracts.map((c, i) => (
              <div key={c.label} className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-5 py-3.5 ${i !== contracts.length - 1 ? 'border-b border-border' : ''}`}>
                <span className="text-xs text-muted-foreground w-36 shrink-0 font-medium uppercase tracking-wider">{c.label}</span>
                <code className="text-sm font-mono break-all">{c.value}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="px-6 py-20 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Compliance-ready by design</h2>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
            Seal encryption + on-chain access control covers the essential requirements of GDPR, DPDP, and PIPL.
            Crypto-shredding via Seal key destruction handles Article 17 erasure. All decryption attempts are logged on Sui.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span>GDPR</span>
            <span className="text-border">|</span>
            <span>DPDP</span>
            <span className="text-border">|</span>
            <span>PIPL</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center text-white font-bold text-[10px]">S</div>
            <span>Sonar</span>
            <span className="text-border">|</span>
            <span>Built for Walrus Sessions 2</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <a href="https://github.com" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
