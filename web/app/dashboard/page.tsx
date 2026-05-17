'use client';

import { useEffect, useState } from 'react';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { suiClient, PACKAGE_ID, network } from '@/lib/sui';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { toast } from 'sonner';

interface FormEntry {
  id: string;
  title: string;
  version: number;
  blobId: string;
  encrypted: boolean;
}

export default function DashboardPage() {
  const account = useCurrentAccount();
  const [forms, setForms] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }

    loadUserForms(account.address).then(setForms).catch(err => {
      console.error(err);
      toast.error('Failed to load your forms from Sui');
    }).finally(() => setLoading(false));
  }, [account]);

  if (!account) {
    return (
      <div className="min-h-screen flex flex-col selection:bg-cta selection:text-cta-foreground" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
        <nav className="px-4 sm:px-6 py-6 border-b-4 border-border-strong bg-card/30">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl neo-btn-cta text-cta-foreground flex items-center justify-center font-black text-xl shadow-brutal-sm">s</div>
              <span className="font-black text-2xl tracking-tighter lowercase">sonar</span>
            </Link>
            <ThemeToggle />
          </div>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="neo-card bg-card p-12 max-w-md shadow-brutal-lg">
            <h1 className="text-4xl mb-4">connect your wallet</h1>
            <p className="text-lg font-bold opacity-60 mb-8 lowercase">you need to connect your sui wallet to view and manage your forms.</p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-cta selection:text-cta-foreground" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
      {/* Nav */}
      <nav className="px-4 sm:px-6 py-6 border-b-4 border-border-strong bg-card/30 sticky top-0 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-6 gap-x-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="w-10 h-10 rounded-xl neo-btn-cta text-cta-foreground flex items-center justify-center font-black text-xl shadow-brutal-sm shrink-0">s</Link>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest opacity-40">dashboard</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent text-white font-black uppercase shrink-0">{network}</span>
              </div>
              <h1 className="text-xl lowercase truncate">your forms</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto sm:ml-0">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl mb-2">welcome back</h2>
            <p className="text-lg font-bold opacity-60 lowercase">manage your decentralized feedback loops</p>
          </div>
          <Link href="/new" className="neo-btn-cta text-cta-foreground px-8 py-3 text-sm text-center">
            + create new form
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-700">
            <div className="w-16 h-16 border-4 border-border-strong border-t-cta rounded-full animate-spin mb-8" />
            <h2 className="text-2xl font-black lowercase opacity-40 mb-2">scouring the blockchain...</h2>
            <p className="text-sm font-bold opacity-20 lowercase tracking-widest">querying sui events & resolving walrus blobs</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="neo-card bg-card p-20 text-center shadow-brutal-lg">
            <p className="text-2xl font-black opacity-20 lowercase mb-8">no forms found on-chain</p>
            <Link href="/new" className="neo-btn bg-accent px-8 py-3 text-sm">start by creating one</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {forms.map(form => (
              <div key={form.id} className="neo-card bg-card group hover:-translate-x-1 hover:-translate-y-1 transition-all shadow-brutal hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="p-6 border-b-2 border-border-strong/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">v{form.version}</span>
                      {form.encrypted && (
                        <span className="text-[10px] bg-info text-info-foreground px-2 py-0.5 rounded font-black uppercase tracking-widest">encrypted</span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const url = `${window.location.origin}/f/${form.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('link copied!');
                      }}
                      className="w-8 h-8 rounded-lg bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                      title="copy shareable link"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </div>
                  <h3 className="text-2xl mb-2 truncate">{form.title}</h3>
                  <code className="text-[10px] font-mono opacity-30 block truncate">{form.id}</code>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2 bg-muted/20">
                  <Link href={`/admin/${form.id}`} className="neo-btn bg-card py-2 text-[10px] text-center hover:bg-cta hover:text-cta-foreground transition-colors shadow-brutal-sm">analytics</Link>
                  <Link href={`/edit/${form.id}`} className="neo-btn bg-card py-2 text-[10px] text-center hover:bg-accent transition-colors shadow-brutal-sm">edit</Link>
                  <Link href={`/f/${form.id}`} className="neo-btn bg-card py-2 text-[10px] text-center hover:bg-card-cream transition-colors shadow-brutal-sm">view live</Link>
                  <Link href={`/verify/${form.id}`} className="neo-btn bg-card py-2 text-[10px] text-center hover:bg-card-cream transition-colors shadow-brutal-sm">verify</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

async function loadUserForms(address: string): Promise<FormEntry[]> {
  // Query events to find forms created by this user
  const events = await suiClient.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::form_registry::FormCreated` },
    order: 'descending',
  });

  const userFormIds = events.data
    .filter(e => (e.parsedJson as any).owner === address)
    .map(e => (e.parsedJson as any).form_id);

  if (userFormIds.length === 0) return [];

  // Fetch the actual object content for these forms
  const objects = await suiClient.multiGetObjects({
    ids: userFormIds,
    options: { showContent: true },
  });

  return objects.map(obj => {
    const content = obj.data?.content;
    if (content?.dataType === 'moveObject') {
      const f = content.fields as any;
      return {
        id: obj.data!.objectId,
        title: f.title,
        version: Number(f.version),
        blobId: f.current_blob_id,
        encrypted: f.encrypted,
      };
    }
    return null;
  }).filter((f): f is FormEntry => f !== null);
}
