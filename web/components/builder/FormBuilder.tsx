/**
 * FormBuilder: the main three-panel builder layout.
 * Left: FieldPalette (drag to add). Center: FormCanvas (reorder, select).
 * Right: FieldProperties (edit selected field). Top bar: form settings + save.
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
import { buildCreateFormTx, buildUpdateFormTx, PACKAGE_ID, suiClient } from '@/lib/sui';
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

  // Auto-show properties on desktop when a field is selected
  useEffect(() => {
    if (selectedFieldId && window.innerWidth >= 1024) setShowProperties(true);
  }, [selectedFieldId]);

  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const mascot = useMascotMood();

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const addField = useCallback((type: FieldType) => {
    const id = crypto.randomUUID();
    const newField: FormField = {
      id,
      type,
      label: defaultLabel(type),
      required: false,
      validations: [],
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(id);
    mascot.setMoodTemp('happy', `Added ${defaultLabel(type)}!`, 2000);
  }, [mascot]);

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId((prev) => (prev === id ? null : prev));
  }, []);

  const moveField = useCallback((fromIndex: number, toIndex: number) => {
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

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
        setPublishedFormId(existingFormId); // Show modal for updates too
        toast.success(`Form updated to v${schema.version}! TX: ${result.digest.slice(0, 16)}...`);
      } else {
        toast.info('Creating form on Sui...');
        const tx = buildCreateFormTx(formTitle, blobId, encrypted);
        const result = await signAndExecute({ transaction: tx });
        
        toast.success(`Form created! TX: ${result.digest.slice(0, 16)}...`);

        // Extract the created object ID (Form object)
        // If effects are missing (common in some wallets), query the TX details
        let createdId = (result as any).effects?.created?.find((c: any) => c.owner === 'Shared' || (typeof c.owner === 'object' && 'Shared' in c.owner))?.reference?.objectId;
        
        if (!createdId) {
          toast.info('Verifying on-chain object...', { duration: 2000 });
          // Wait a moment for indexing and fetch full TX details
          await new Promise(r => setTimeout(r, 2000));
          try {
            const txData = await suiClient.getTransactionBlock({
              digest: result.digest,
              options: { showEffects: true, showEvents: true }
            });
            
            // Try events first (most reliable for our Move logic)
            const event = txData.events?.find(e => e.type.endsWith('::FormCreated'));
            createdId = (event?.parsedJson as any)?.form_id;

            // Fallback to effects
            if (!createdId) {
              createdId = txData.effects?.created?.find(c => 
                c.owner === 'Shared' || (typeof c.owner === 'object' && 'Shared' in c.owner)
              )?.reference?.objectId;
            }
          } catch (e) {
            console.error('Failed to fetch TX details:', e);
          }
        }
        
        if (createdId) {
          setPublishedFormId(createdId);
        } else {
          // If we still can't find it, we might have to fallback to dashboard
          toast.warning('Form created, but link discovery failed. Please check your dashboard.');
        }
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
          <h2 className="text-4xl mb-4 font-black lowercase">publishing...</h2>
          <p className="text-lg font-bold opacity-60 lowercase max-w-sm">
            uploading schema to walrus and registering your shared object on sui. do not close this window.
          </p>
        </div>
      )}

      {/* Top bar */}
      <div className="border-b-4 border-border-strong px-4 sm:px-6 py-6 flex items-center justify-between shrink-0 gap-4 bg-card/30">
        <div className="flex items-center gap-4 min-w-0">
          <a href="/" className="w-10 h-10 rounded-xl neo-btn-cta text-cta-foreground flex items-center justify-center font-black text-xl shadow-brutal-sm shrink-0">s</a>
          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="bg-transparent text-xl sm:text-2xl font-black outline-none border-b-2 border-transparent hover:border-border-strong focus:border-accent transition-colors px-1 min-w-0 lowercase placeholder:opacity-30"
            placeholder="untitled form"
          />
        </div>
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`neo-btn hidden sm:flex items-center gap-2 text-xs px-6 py-2.5 ${showSettings ? 'bg-accent' : 'bg-card'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            settings
          </button>
          <label className="hidden sm:flex items-center gap-3 text-xs font-black uppercase tracking-widest opacity-60 cursor-pointer hover:opacity-100 transition-opacity">
            <input type="checkbox" checked={encrypted} onChange={e => setEncrypted(e.target.checked)} className="w-5 h-5 accent-cta border-2 border-border-strong rounded shadow-brutal-sm" />
            encrypt
          </label>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`neo-btn hidden sm:flex items-center gap-2 text-xs px-6 py-2.5 ${showPreview ? 'bg-accent' : 'bg-card'}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"/><circle cx="7" cy="7" r="1.5"/></svg>
            preview
          </button>
          <a href="/dashboard" className="hidden lg:inline font-black lowercase hover:text-accent transition-colors text-xs">dashboard</a>
          <ThemeToggle />
          <div className="hidden sm:block"><ConnectButton /></div>
          <button
            onClick={handleSave}
            disabled={isSaving || !account}
            className="neo-btn-cta text-cta-foreground px-6 sm:px-10 py-2.5 text-sm"
          >
            {isSaving ? 'saving...' : isEditing ? 'update' : 'publish'} &rarr;
          </button>
        </div>
      </div>

      {/* Mobile toolbar: add field + properties toggle */}
      <div className="lg:hidden flex items-center border-b-2 border-border-strong bg-card/50">
        <button
          onClick={() => { setShowPalette(!showPalette); setShowProperties(false); }}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${showPalette ? 'bg-cta text-cta-foreground' : 'text-muted-foreground'}`}
        >
          + add field
        </button>
        <button
          onClick={() => { setShowProperties(!showProperties); setShowPalette(false); }}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${showProperties ? 'bg-accent' : 'text-muted-foreground'}`}
        >
          properties
        </button>
        <div className="sm:hidden flex items-center px-4 border-l-2 border-border-strong h-full">
          <ConnectButton />
        </div>
      </div>

      {/* Mobile: palette dropdown */}
      {showPalette && (
        <div className="lg:hidden border-b-2 border-border-strong max-h-64 overflow-y-auto bg-card">
          <FieldPalette onAddField={(type) => { addField(type); setShowPalette(false); }} />
        </div>
      )}

      {/* Mobile: properties dropdown */}
      {showProperties && selectedField && (
        <div className="lg:hidden border-b-2 border-border-strong max-h-80 overflow-y-auto bg-card">
          <FieldProperties field={selectedField} allFields={fields} onUpdate={updateField} />
        </div>
      )}

      {/* Three-panel layout (desktop) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Field Palette — hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block w-64 border-r-4 border-border-strong overflow-y-auto shrink-0 bg-card/20">
          <FieldPalette onAddField={addField} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto bg-background/50 relative">
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
        </div>

        {/* Right: Properties — hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block w-80 border-l-4 border-border-strong overflow-y-auto shrink-0 bg-card/20">
          <FieldProperties field={selectedField} allFields={fields} onUpdate={updateField} />
        </div>
      </div>

      {/* Mascot — bottom right corner */}
      <div className="hidden lg:flex fixed bottom-6 right-[340px] z-30 pointer-events-none">
        <SonarMascot mood={mascot.mood} size="sm" message={mascot.message} />
      </div>

      {/* Preview overlay */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto selection:bg-cta">
          <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b-4 border-border-strong px-6 py-6 flex items-center justify-between shadow-brutal">
            <div className="flex items-center gap-4">
              <span className="neo-card bg-accent px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-brutal-sm">preview mode</span>
              <span className="text-sm font-bold opacity-50 lowercase hidden sm:inline">this is how respondents will see your form</span>
            </div>
            <button onClick={() => setShowPreview(false)} className="neo-btn bg-card px-6 py-2 text-sm">
              back to editor
            </button>
          </div>
          <div className="bg-background min-h-full py-20" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
            <PreviewRenderer
              formTitle={formTitle}
              formDescription={formDescription}
              fields={fields}
              encrypted={encrypted}
            />
          </div>
        </div>
      )}

      {/* Success Modal */}
      {publishedFormId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPublishedFormId(null)} />
          <div className="relative w-full max-w-lg neo-card bg-card p-10 sm:p-14 shadow-brutal-lg animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-2xl bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center mx-auto mb-8 shadow-brutal-sm">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h2 className="text-4xl text-center mb-4">form published!</h2>
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
            <h2 className="text-3xl mb-8">form settings</h2>
            
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

function PreviewRenderer({ formTitle, formDescription, fields, encrypted }: { formTitle: string; formDescription: string; fields: FormField[]; encrypted: boolean }) {
  return (
    <div className="max-w-2xl mx-auto px-6">
      <div className="neo-card bg-card p-10 sm:p-14 shadow-brutal-lg mb-20">
        {/* Encryption notice */}
        {encrypted && <EncryptionNotice />}

        <h1 className="text-4xl sm:text-5xl mb-4 leading-tight">{formTitle || 'untitled form'}</h1>
        {formDescription && <p className="text-lg font-bold opacity-60 mb-12 leading-tight lowercase">{formDescription}</p>}

        <div className="space-y-12">
          {fields.map((field) => (
            <PreviewField key={field.id} field={field} />
          ))}
        </div>

        <button disabled className="w-full mt-16 neo-btn bg-cta text-cta-foreground py-5 text-xl opacity-60 cursor-not-allowed">
          submit (preview only)
        </button>

        <p className="text-center text-xs font-black uppercase tracking-widest opacity-20 mt-10">
          powered by <span className="text-foreground underline">sonar</span> — stored on walrus
        </p>
      </div>
    </div>
  );
}

function EncryptionNotice() {
  return (
    <div className="neo-card bg-info p-8 mb-12 border-border-strong shadow-brutal">
      <div className="flex gap-6">
        <div className="w-12 h-12 rounded-xl bg-card border-2 border-border-strong flex items-center justify-center shrink-0 shadow-brutal-sm">
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl mb-2 text-info-foreground">your response is encrypted</h2>
          <p className="text-sm font-bold text-info-foreground/70 leading-tight lowercase mb-4">
            this form uses end-to-end encryption powered by seal. your data is encrypted in your browser
            before being stored on walrus. only the form owner can
            decrypt your response.
          </p>
          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-info-foreground/40">
            <span>client-side seal</span>
            <span>decentralized walrus</span>
            <span>owner-only access</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field }: { field: FormField }) {
  const cls = 'w-full neo-input font-bold text-lg lowercase placeholder:opacity-20';

  if (field.type === 'section_header') {
    return (
      <div className="pt-10 border-t-4 border-border-strong/5">
        <h3 className="text-3xl mb-2">{field.label}</h3>
        {field.helpText && <p className="text-sm font-bold opacity-50 lowercase">{field.helpText}</p>}
      </div>
    );
  }
  if (field.type === 'description_block') {
    return <p className="text-lg font-bold opacity-60 lowercase leading-tight">{field.label}</p>;
  }

  return (
    <div className="space-y-4">
      <label className="block text-lg font-black lowercase tracking-tight">
        {field.label}
        {field.required && <span className="text-destructive ml-2 font-black text-2xl leading-none">*</span>}
      </label>
      {field.helpText && <p className="text-sm font-bold opacity-50 lowercase leading-tight">{field.helpText}</p>}

      {field.type === 'short_text' && <input disabled placeholder={field.placeholder || `enter ${field.label.toLowerCase()}...`} className={cls} />}
      {field.type === 'long_text' && <textarea disabled placeholder={field.placeholder} rows={4} className={`${cls} resize-none`} />}
      {field.type === 'rich_text' && <textarea disabled placeholder="markdown supported..." rows={5} className={`${cls} font-mono resize-none`} />}
      {field.type === 'email' && <input disabled type="email" placeholder={field.placeholder || 'email@example.com'} className={cls} />}
      {field.type === 'url' && <input disabled type="url" placeholder={field.placeholder || 'https://'} className={cls} />}
      {field.type === 'number' && <input disabled type="number" placeholder={field.placeholder || '0'} className={cls} />}
      {field.type === 'date' && <input disabled type="date" className={cls} />}
      {field.type === 'dropdown' && (
        <select disabled className={cls}><option>Select...</option>{(field.options ?? []).map(o => <option key={o}>{o}</option>)}</select>
      )}
      {(field.type === 'radio') && (
        <div className="space-y-4">{(field.options ?? ['option 1', 'option 2']).map(o => (
          <label key={o} className="flex items-center gap-4 cursor-pointer group"><div className="w-6 h-6 rounded-full border-2 border-border-strong group-hover:bg-accent/20 transition-colors" /><span className="text-lg font-bold lowercase">{o}</span></label>
        ))}</div>
      )}
      {(field.type === 'checkboxes' || field.type === 'multi_select') && (
        <div className="space-y-4">{(field.options ?? ['option 1', 'option 2']).map(o => (
          <label key={o} className="flex items-center gap-4 cursor-pointer group"><div className="w-6 h-6 rounded-lg border-2 border-border-strong group-hover:bg-accent/20 transition-colors" /><span className="text-lg font-bold lowercase">{o}</span></label>
        ))}</div>
      )}
      {field.type === 'star_rating' && (
        <div className="flex gap-2">{Array.from({ length: (field.config?.maxRating as number) ?? 5 }, (_, i) => (
          <span key={i} className="text-4xl opacity-20 hover:opacity-100 transition-opacity">&#9733;</span>
        ))}</div>
      )}
      {(field.type === 'image_upload' || field.type === 'video_upload' || field.type === 'file_upload') && (
        <div className="neo-card bg-card-cream border-dashed border-4 border-border-strong/20 p-12 text-center shadow-none hover:border-accent transition-colors">
          <p className="text-lg font-black lowercase mb-2">click or drag to upload {field.type.replace('_upload', '')}</p>
          <p className="text-xs font-black uppercase tracking-widest opacity-30">max {(field.config?.maxSizeMB as number) ?? (field.type === 'video_upload' ? 10 : 5)}mb — stored on walrus</p>
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
