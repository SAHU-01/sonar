'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const PACKAGE_ID = '0x21f54aae5eb9a8cfef519e0dd528bbb622a28796f430705a2bdd16893f09a62b';
const FORM_OBJECT_ID = '0x24371ba6cda7d8ccb6dfa636122b7b2b414e4782caf684388e8d51e27dbf72ed';

const features = [
  {
    title: 'tamper-evident',
    description: 'Every submission is stored on Walrus and indexed via Sui events. Merkle roots committed on-chain make bulk tampering detectable.',
  },
  {
    title: 'encryption-ready',
    description: 'Toggle per-form encryption powered by Seal. Responses are encrypted client-side before touching any server. Only the form owner decrypts.',
  },
  {
    title: 'own your data',
    description: 'No vendor lock-in. Your form schemas and submissions live on Walrus — a decentralized storage network. Export anytime, or read directly on-chain.',
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
  const account = useCurrentAccount();
  const router = useRouter();

  const handleCreateClick = (e: React.MouseEvent) => {
    if (!account) {
      e.preventDefault();
      toast.error('wallet not connected', {
        description: 'sonar needs your sui connection to publish forms. please connect using the button in the top right.',
        duration: 5000,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-cta selection:text-cta-foreground" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
      {/* Nav */}
      <nav className="px-4 sm:px-6 py-6 flex flex-col gap-4">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl neo-btn-cta text-cta-foreground flex items-center justify-center font-black text-xl shadow-brutal-sm shrink-0">s</div>
            <span className="font-black text-2xl tracking-tighter lowercase">sonar</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4">
              {account && (
                <Link href="/dashboard" className="font-black lowercase hover:text-accent transition-colors">dashboard</Link>
              )}
              <Link href="/docs" className="font-black lowercase hover:text-accent transition-colors">docs</Link>
            </div>
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
        {/* Mobile secondary nav: equal halves grid */}
        <div className="sm:hidden grid grid-cols-2 border-y-4 border-border-strong bg-card/20">
          <Link 
            href={account ? "/dashboard" : "/docs"} 
            className="py-4 text-center font-black lowercase text-xs border-r-4 border-border-strong hover:bg-accent transition-colors"
          >
            {account ? "dashboard" : "docs"}
          </Link>
          <Link 
            href={account ? "/docs" : "/new"} 
            onClick={!account ? handleCreateClick : undefined}
            className="py-4 text-center font-black lowercase text-xs hover:bg-cta hover:text-cta-foreground transition-colors"
          >
            {account ? "docs" : "create form"}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-12 pb-20">
        <div className="max-w-4xl text-center">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl mb-6 leading-[0.9]">
            the feedback layer<br />
            <span className="text-accent underline decoration-border-strong decoration-4 underline-offset-8">for sui.</span>
          </h1>
          <p className="text-lg sm:text-xl font-bold max-w-2xl mx-auto mb-12 leading-tight lowercase opacity-80">
            drop-in feedback forms for any sui project. submissions stored on walrus. optionally encrypted via seal. tamper-evident by default.
          </p>

          {/* CTA Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link 
              href="/new" 
              onClick={handleCreateClick}
              className="group neo-card bg-accent hover:bg-accent-hover p-6 text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl mb-1 text-foreground">create a form</h2>
                  <p className="text-sm font-bold opacity-70">build & publish in minutes</p>
                </div>
                <span className="text-3xl group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>
            <Link href="/docs" className="group neo-card bg-cta hover:bg-cta-hover p-6 text-left text-cta-foreground">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl mb-1">documentation</h2>
                  <p className="text-sm font-bold opacity-70">guides, examples & API reference</p>
                </div>
                <span className="text-3xl group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 py-20 bg-background/50">
        <div className="max-w-5xl mx-auto">
          <div className="neo-card bg-card p-8 mb-10">
            <h2 className="text-3xl mb-2">why sonar?</h2>
            <p className="font-bold opacity-60">decentralized, verifiable, encrypted feedback — built on sui + walrus + seal</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="neo-card bg-card p-6">
                <h3 className="text-xl mb-3">{f.title}</h3>
                <p className="text-sm font-bold opacity-70 leading-snug">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card border-border-warm bg-card p-8 sm:p-12 shadow-[8px_8px_0px_0px_var(--border-warm)]">
            <h2 className="text-4xl mb-2">how it works</h2>
            <p className="font-bold opacity-60 mb-12">four steps from zero to verifiable feedback</p>
            <div className="space-y-10">
              {[
                { step: '1', title: 'create a form', desc: 'use the builder to design your form with 17 field types and zod-powered validation. the schema is uploaded to walrus and registered on sui.' },
                { step: '2', title: 'share the link', desc: 'each form gets a shareable url using its sui object id. public forms need no wallet — respondents just fill and submit.' },
                { step: '3', title: 'submissions go to walrus', desc: 'each response is stored as a blob on walrus. the blob id is recorded on sui via a submissionrecorded event.' },
                { step: '4', title: 'view on the dashboard', desc: 'the admin dashboard reads sui events to find all submissions, fetches them from walrus, and displays analytics — all client-side.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-6">
                  <div className="w-12 h-12 rounded-xl bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center text-xl font-black shadow-brutal-sm shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-2xl mb-2">{item.title}</h3>
                    <p className="text-base font-bold opacity-70 leading-tight lowercase">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* On-chain details */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card bg-card p-8 sm:p-10">
            <h2 className="text-3xl mb-2">on-chain details</h2>
            <p className="font-bold opacity-60 mb-8">all contracts and infrastructure are live and verifiable</p>
            <div className="neo-card bg-card-cream border-border overflow-hidden shadow-none">
              {contracts.map((c, i) => (
                <div key={c.label} className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-6 py-4 ${i !== contracts.length - 1 ? 'border-b-2 border-border' : ''}`}>
                  <span className="text-xs font-black uppercase tracking-widest opacity-50 w-40 shrink-0">{c.label}</span>
                  <code className="text-sm font-mono break-all font-bold">{c.value}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card bg-info p-8 sm:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-4xl text-info-foreground mb-4">compliance-ready by design</h2>
            <p className="text-lg font-bold text-info-foreground/80 leading-tight mb-8 lowercase">
              seal encryption + on-chain access control covers the essential requirements of gdpr, dpdp, and pipl.
              crypto-shredding via seal key destruction handles article 17 erasure. all decryption attempts are logged on sui.
            </p>
            <div className="flex items-center gap-6 text-sm font-black text-info-foreground/50 tracking-tighter">
              <span>GDPR</span>
              <span>DPDP</span>
              <span>PIPL</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-border-strong bg-card px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center font-black shadow-brutal-sm">s</div>
            <span className="font-black text-xl lowercase">sonar</span>
            <span className="font-bold opacity-20">/</span>
            <span className="font-bold opacity-50 text-xs">built for walrus sessions 2</span>
          </div>
          <div className="flex items-center gap-8 font-black lowercase">
            <Link href="/docs" className="hover:text-accent transition-colors">docs</Link>
            <a href="https://github.com" className="hover:text-accent transition-colors">github</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
