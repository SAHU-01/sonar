/**
 * FormBuilder: the main three-panel builder layout.
 * Optimized for both desktop (side-by-side) and mobile (modal/FAB).
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { FieldPalette } from './FieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldProperties } from './FieldProperties';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectButton } from '@mysten/dapp-kit';
import { uploadBlob } from '@/lib/walrus';
import { buildCreateFormTx, buildUpdateFormTx, PACKAGE_ID, suiClient, network } from '@/lib/sui';
import { toast } from 'sonner';
import { SonarMascot, useMascotMood } from '@/components/SonarMascot';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { FormField, FieldType, FormSchemaType } from '@sonar/shared/schema';

interface FormBuilderProps {
  existingFormId?: string;
  existingSchema?: FormSchemaType;
}

export function FormBuilder({ existingFormId, existingSchema }: FormBuilderProps = {}) {
  const [fields, setFields] = useState<FormField[]>(existingSchema?.fields ?? []);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState(existingSchema?.title ?? 'Untitled Form');
  const [formDescription, setFormDescription] = useState(existingSchema?.description ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [encrypted, setEncrypted] = useState(existingSchema?.encryption?.enabled ?? false);
  const isEditing = !!existingFormId;
  const [showPalette, setShowPalette] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [submissionLimit, setSubmissionLimit] = useState<'open' | 'per_wallet'>(existingSchema?.submissionLimit ?? 'per_wallet');
  const [allowEditing, setAllowEditing] = useState(existingSchema?.allowEditing ?? false);
  const [publishedFormId, setPublishedFormId] = useState<string | null>(null);

  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const mascot = useMascotMood();

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  // Auto-show properties on desktop, and handle mobile transitions
  useEffect(() => {
    if (selectedFieldId) {
      if (window.innerWidth >= 1024) {
        setShowProperties(true);
      } else {
        setShowProperties(true);
        setShowPalette(false);
      }
    }
  }, [selectedFieldId]);

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: defaultLabel(type),
      required: false,
      validations: [],
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
    setShowPalette(false);
    mascot.setMoodTemp('happy', `Added ${type.replace('_', ' ')}!`, 2000);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    mascot.setMoodTemp('sad', 'Field removed', 2000);
  };

  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFields(next);
  };

  const duplicateField = useCallback((id: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const newField = { ...prev[idx], id: crypto.randomUUID() };
      const next = [...prev];
      next.splice(idx + 1, 0, newField);
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!account) {
      toast.error('Connect your wallet to publish a form');
      return;
    }
    if (fields.length === 0) {
      toast.error('Add at least one field');
      return;
    }
    if (!PACKAGE_ID) {
      toast.error('Package ID not configured');
      return;
    }

    setIsSaving(true);
    mascot.setMood('working');
    mascot.setMessage('Uploading to Walrus...');
    try {
      const schema = {
        version: (existingSchema?.version ?? 0) + 1,
        title: formTitle,
        description: formDescription || undefined,
        fields,
        successMessage: 'Thanks for your submission!',
        submissionLimit,
        allowEditing,
        accessControl: { type: 'public' as const },
        encryption: { enabled: encrypted, policyPackageId: encrypted ? PACKAGE_ID : undefined, policyModule: encrypted ? 'policy_owner_only' : undefined },
      };

      toast.info('Uploading form schema to Walrus...');
      const blobId = await uploadBlob(JSON.stringify(schema));
      toast.success(`Schema uploaded: ${blobId.slice(0, 16)}...`);

      mascot.setMessage('Recording on Sui...');
      if (isEditing && existingFormId) {
        toast.info('Updating form on Sui (new version)...');
        const tx = buildUpdateFormTx(existingFormId, blobId);
        const result = await signAndExecute({ transaction: tx });
        setPublishedFormId(existingFormId); 
        toast.success(`Form updated to v${schema.version}! TX: ${result.digest.slice(0, 16)}...`);
      } else {
        toast.info('Creating form on Sui...');
        const tx = buildCreateFormTx(formTitle, blobId, encrypted);
        const result = await signAndExecute({ transaction: tx });
        
        toast.success(`Form created! TX: ${result.digest.slice(0, 16)}...`);

        let createdId = (result as any).effects?.created?.find((c: any) => {
          const owner = c.owner as any;
          return owner === 'Shared' || (owner && typeof owner === 'object' && 'Shared' in owner);
        })?.reference?.objectId;
        
        if (!createdId) {
          toast.info('Verifying on-chain object...', { duration: 2000 });
          await new Promise(r => setTimeout(r, 2000));
          try {
            const txData = await suiClient.getTransactionBlock({
              digest: result.digest,
              options: { showEffects: true, showEvents: true }
            });
            const event = txData.events?.find(e => e.type.endsWith('::FormCreated'));
            createdId = (event?.parsedJson as any)?.form_id;
            if (!createdId) {
              createdId = txData.effects?.created?.find(c => {
                const owner = c.owner as any;
                return owner === 'Shared' || (owner && typeof owner === 'object' && 'Shared' in owner);
              })?.reference?.objectId;
            }
          } catch (e) { console.error(e); }
        }
        
        if (createdId) setPublishedFormId(createdId);
        else toast.warning('Form created, check your dashboard for the link.');
      }
      mascot.setMoodTemp('success', 'Published!', 4000);
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      mascot.setMoodTemp('error', 'Save failed', 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Processing Overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-24 h-24 border-8 border-border-strong border-t-accent rounded-full animate-spin mb-8 shadow-brutal-sm" />
          <h2 className="text-4xl mb-4 font-black lowercase text-foreground">publishing...</h2>
          <p className="text-lg font-bold opacity-60 lowercase max-w-sm">
            uploading schema to walrus and registering your shared object on sui. do not close this window.
          </p>
        </div>
      )}

      {/* Top bar */}
      <div className="border-b-4 border-border-strong flex flex-col shrink-0 bg-card/30 z-20">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <a href="/" className="w-10 h-10 rounded-xl neo-btn-cta text-cta-foreground flex items-center justify-center font-black text-xl shadow-brutal-sm shrink-0">s</a>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="bg-transparent text-xl sm:text-2xl font-black outline-none border-b-2 border-transparent hover:border-border-strong focus:border-accent transition-colors px-1 min-w-0 lowercase placeholder:opacity-30"
              placeholder="untitled form"
            />
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            {/* Desktop-only options */}
            <div className="hidden lg:flex items-center gap-6">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`neo-btn flex items-center gap-2 text-xs px-6 py-2.5 shadow-brutal-sm ${showSettings ? 'bg-accent' : 'bg-card'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                settings
              </button>
              <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest opacity-60 cursor-pointer hover:opacity-100 transition-opacity">
                <input type="checkbox" checked={encrypted} onChange={e => setEncrypted(e.target.checked)} className="w-5 h-5 accent-cta border-2 border-border-strong rounded shadow-brutal-sm" />
                encrypt
              </label>
              <Link href="/dashboard" className="font-black lowercase hover:text-accent transition-colors text-xs">dashboard</Link>
            </div>

            <button
              onClick={() => {
                setShowPreview(!showPreview);
                if (!showPreview) {
                  toast.info(encrypted ? 'Preview mode: Encryption is enabled' : 'Preview mode: Data will be plaintext', {
                    description: encrypted ? 'Responses will be encrypted client-side using Seal.' : 'Responses will not be encrypted.',
                    duration: 3000,
                  });
                }
              }}
              className={`neo-btn w-10 h-10 flex items-center justify-center sm:w-auto sm:px-6 sm:py-2.5 sm:text-xs sm:gap-2 shadow-brutal-sm ${showPreview ? 'bg-accent' : 'bg-card'}`}
              title="Preview"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="hidden sm:inline font-black lowercase">preview</span>
            </button>
            
            <div className="hidden sm:flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden lg:block"><ConnectButton /></div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving || !account}
              className="neo-btn-cta text-cta-foreground px-4 sm:px-10 py-2.5 text-sm shadow-brutal-sm"
            >
              {isSaving ? '...' : isEditing ? 'update' : 'publish'} &rarr;
            </button>
          </div>
        </div>
        {/* Mobile secondary row */}
        <div className="lg:hidden border-t-2 border-border-strong/10 px-4 py-3 flex items-center justify-between bg-card/20">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="font-black lowercase hover:text-accent transition-colors text-sm mr-2">dashboard</Link>
            <ThemeToggle />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 rounded-xl bg-card border-2 border-border-strong flex items-center justify-center shadow-brutal-sm hover:bg-muted transition-colors"
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </button>
          </div>
          <div className="scale-90 origin-right">
            <ConnectButton />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Palette — Mobile Overlay / Desktop Sidebar */}
        <div className={`
          fixed inset-0 z-40 bg-background lg:relative lg:z-0 lg:flex lg:w-72 lg:border-r-4 lg:border-border-strong lg:bg-card/20 lg:translate-x-0
          transition-transform duration-300 transform
          ${showPalette ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="lg:hidden sticky top-0 bg-card border-b-4 border-border-strong px-6 py-4 flex items-center justify-between shrink-0">
            <span className="font-black lowercase text-xl">add a field</span>
            <button onClick={() => setShowPalette(false)} className="neo-btn bg-accent px-4 py-1.5 text-xs">close</button>
          </div>
          <div className="h-full overflow-y-auto w-full">
             <FieldPalette onAddField={addField} />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 overflow-y-auto bg-background selection:bg-cta flex flex-col items-center relative">
          <div className="w-full max-w-3xl mb-32">
            <FormCanvas
              fields={fields}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onMoveField={moveField}
              onRemoveField={removeField}
              onDuplicateField={duplicateField}
              formTitle={formTitle} 
              formDescription={formDescription}
              onDescriptionChange={setFormDescription}
              isPublished={isEditing}
            />
            
            {fields.length > 0 && (
              <div className="px-6 max-w-3xl mx-auto">
                <button disabled className="w-full mt-16 neo-btn bg-cta text-cta-foreground py-5 text-xl opacity-60 cursor-not-allowed">
                  submit (preview only)
                </button>
              </div>
            )}
          </div>

          {/* Mascot — always visible bottom right of canvas */}
          <div className="fixed bottom-6 right-6 lg:right-[340px] z-30 pointer-events-none transition-all">
            <SonarMascot mood={mascot.mood} size="sm" message={mascot.message} />
          </div>
        </div>

        {/* Right: Properties — Mobile Overlay / Desktop Sidebar */}
        <div className={`
          fixed inset-0 z-40 bg-background lg:relative lg:z-0 lg:flex lg:w-80 lg:border-l-4 lg:border-border-strong lg:bg-card/20 lg:translate-x-0
          transition-transform duration-300 transform
          ${showProperties ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="lg:hidden sticky top-0 bg-card border-b-4 border-border-strong px-6 py-4 flex items-center justify-between shrink-0">
            <span className="font-black lowercase text-xl">field properties</span>
            <button onClick={() => { setShowProperties(false); setSelectedFieldId(null); }} className="neo-btn bg-accent px-4 py-1.5 text-xs">done</button>
          </div>
          <div className="h-full overflow-y-auto w-full flex flex-col">
            <FieldProperties field={selectedField} allFields={fields} onUpdate={updateField} />
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) for Mobile - Add Field */}
      <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
        {selectedFieldId && !showProperties && (
          <button 
            onClick={() => setShowProperties(true)}
            className="neo-btn bg-accent px-6 py-3 font-black lowercase shadow-brutal flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            edit field
          </button>
        )}
        <button 
          onClick={() => { setShowPalette(true); setShowProperties(false); }}
          className="w-16 h-16 rounded-2xl bg-cta text-cta-foreground border-4 border-border-strong flex items-center justify-center shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      {/* Success Modal */}
      {publishedFormId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPublishedFormId(null)} />
          <div className="relative w-full max-w-lg neo-card bg-card p-10 sm:p-14 shadow-brutal-lg animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-2xl bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center mx-auto mb-8 shadow-brutal-sm">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h2 className="text-4xl text-center mb-4 font-black lowercase text-foreground">form published!</h2>
            <p className="text-lg font-bold text-center opacity-60 mb-10 lowercase leading-tight">
              your form is live on the sui blockchain. share the link below to start collecting decentralized feedback.
            </p>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">live form url</span>
                <div className="flex gap-2">
                  <code className="flex-1 neo-card bg-card-cream px-4 py-3 text-xs font-mono font-bold opacity-70 truncate shadow-none border-dashed">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/f/${publishedFormId}`}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/f/${publishedFormId}`);
                      toast.success('Link copied to clipboard!');
                    }}
                    className="neo-btn-cta text-cta-foreground px-6 py-3 text-xs shrink-0"
                  >
                    copy
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Link 
                  href={`/admin/${publishedFormId}`}
                  className="neo-btn bg-accent py-3 text-xs text-center font-black lowercase"
                >
                  view analytics
                </Link>
                <button 
                  onClick={() => setPublishedFormId(null)}
                  className="neo-btn bg-card py-3 text-xs text-center font-black lowercase"
                >
                  close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md neo-card bg-card p-10 shadow-brutal-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-3xl font-black lowercase text-foreground">form settings</h2>
               <button onClick={() => setShowSettings(false)} className="neo-btn bg-accent px-4 py-1.5 text-xs">close</button>
            </div>
            
            <div className="space-y-10">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">submission rules</p>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setSubmissionLimit('per_wallet')}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${submissionLimit === 'per_wallet' ? 'bg-cta text-cta-foreground border-border-strong' : 'bg-card border-border-strong/10 hover:border-border-strong'}`}
                  >
                    <div className="text-left">
                      <p className="font-black text-sm lowercase">one time submission</p>
                      <p className="text-[10px] opacity-60">limit to one response per wallet</p>
                    </div>
                    {submissionLimit === 'per_wallet' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                  <button 
                    onClick={() => setSubmissionLimit('open')}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${submissionLimit === 'open' ? 'bg-cta text-cta-foreground border-border-strong' : 'bg-card border-border-strong/10 hover:border-border-strong'}`}
                  >
                    <div className="text-left">
                      <p className="font-black text-sm lowercase">multiple responses</p>
                      <p className="text-[10px] opacity-60">allow unlimited responses per user</p>
                    </div>
                    {submissionLimit === 'open' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">privacy & editing</p>
                <button 
                  onClick={() => setAllowEditing(!allowEditing)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${allowEditing ? 'bg-accent border-border-strong' : 'bg-card border-border-strong/10 hover:border-border-strong'}`}
                >
                  <div className="text-left">
                    <p className="font-black text-sm lowercase">allow editing responses</p>
                    <p className="text-[10px] opacity-60">respondents can update their last submission</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full border-2 border-border-strong relative transition-colors ${allowEditing ? 'bg-black' : 'bg-muted'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full border-2 border-border-strong transition-all ${allowEditing ? 'right-0.5 bg-accent' : 'left-0.5 bg-card'}`} />
                  </div>
                </button>

                <label className="w-full flex items-center justify-between p-4 rounded-xl border-2 bg-card border-border-strong/10 hover:border-border-strong transition-all cursor-pointer">
                  <div className="text-left">
                    <p className="font-black text-sm lowercase">seal encryption</p>
                    <p className="text-[10px] opacity-60">end-to-end privacy powered by seal</p>
                  </div>
                  <input type="checkbox" checked={encrypted} onChange={e => setEncrypted(e.target.checked)} className="w-6 h-6 accent-cta border-2 border-border-strong rounded shadow-brutal-sm" />
                </label>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full neo-btn bg-card py-4 text-sm font-black lowercase mt-4 shadow-brutal-sm"
              >
                done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function defaultLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    short_text: 'Short text',
    long_text: 'Long text',
    rich_text: 'Rich text',
    dropdown: 'Dropdown',
    multi_select: 'Multi select',
    checkboxes: 'Checkboxes',
    radio: 'Radio',
    star_rating: 'Rating',
    number: 'Number',
    url: 'URL',
    email: 'Email',
    date: 'Date',
    image_upload: 'Image upload',
    video_upload: 'Video upload',
    file_upload: 'File upload',
    section_header: 'Section',
    description_block: 'Description',
  };
  return labels[type] ?? type;
}
