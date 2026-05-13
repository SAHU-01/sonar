/**
 * FormBuilder: the main three-panel builder layout.
 * Left: FieldPalette (drag to add). Center: FormCanvas (reorder, select).
 * Right: FieldProperties (edit selected field). Top bar: form settings + save.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { FieldPalette } from './FieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldProperties } from './FieldProperties';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectButton } from '@mysten/dapp-kit';
import { uploadBlob } from '@/lib/walrus';
import { buildCreateFormTx, buildUpdateFormTx, PACKAGE_ID } from '@/lib/sui';
import { toast } from 'sonner';
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

  // Auto-show properties on desktop when a field is selected
  useEffect(() => {
    if (selectedFieldId && window.innerWidth >= 1024) setShowProperties(true);
  }, [selectedFieldId]);

  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

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
  }, []);

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
    try {
      const schema = {
        version: (existingSchema?.version ?? 0) + 1,
        title: formTitle,
        description: formDescription || undefined,
        fields,
        successMessage: 'Thanks for your submission!',
        submissionLimit: 'open' as const,
        accessControl: { type: 'public' as const },
        encryption: { enabled: encrypted, policyPackageId: encrypted ? PACKAGE_ID : undefined, policyModule: encrypted ? 'policy_owner_only' : undefined },
      };

      toast.info('Uploading form schema to Walrus...');
      const blobId = await uploadBlob(JSON.stringify(schema));
      toast.success(`Schema uploaded: ${blobId.slice(0, 16)}...`);

      if (isEditing && existingFormId) {
        toast.info('Updating form on Sui (new version)...');
        const tx = buildUpdateFormTx(existingFormId, blobId);
        const result = await signAndExecute({ transaction: tx });
        toast.success(`Form updated to v${schema.version}! TX: ${result.digest.slice(0, 16)}...`);
      } else {
        toast.info('Creating form on Sui...');
        const tx = buildCreateFormTx(formTitle, blobId, false);
        const result = await signAndExecute({ transaction: tx });
        toast.success(`Form created! TX: ${result.digest.slice(0, 16)}...`);
      }
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="border-b border-border px-3 sm:px-4 py-3 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <a href="/" className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs shrink-0">S</a>
          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="bg-transparent text-base sm:text-lg font-semibold outline-none border-b border-transparent hover:border-border focus:border-accent transition-colors px-1 min-w-0"
            placeholder="Form title"
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <label className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={encrypted} onChange={e => setEncrypted(e.target.checked)} className="accent-accent w-3.5 h-3.5" />
            Encrypt
          </label>
          <div className="hidden sm:block"><ConnectButton /></div>
          <button
            onClick={handleSave}
            disabled={isSaving || !account}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Mobile toolbar: add field + properties toggle */}
      <div className="lg:hidden flex items-center border-b border-border">
        <button
          onClick={() => { setShowPalette(!showPalette); setShowProperties(false); }}
          className={`flex-1 text-xs py-2.5 font-medium transition-colors ${showPalette ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground'}`}
        >
          + Add Field
        </button>
        <button
          onClick={() => { setShowProperties(!showProperties); setShowPalette(false); }}
          className={`flex-1 text-xs py-2.5 font-medium transition-colors ${showProperties ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground'}`}
        >
          Properties
        </button>
        <div className="sm:hidden flex items-center px-3 border-l border-border">
          <ConnectButton />
        </div>
      </div>

      {/* Mobile: palette dropdown */}
      {showPalette && (
        <div className="lg:hidden border-b border-border max-h-64 overflow-y-auto">
          <FieldPalette onAddField={(type) => { addField(type); setShowPalette(false); }} />
        </div>
      )}

      {/* Mobile: properties dropdown */}
      {showProperties && selectedField && (
        <div className="lg:hidden border-b border-border max-h-80 overflow-y-auto">
          <FieldProperties field={selectedField} onUpdate={updateField} />
        </div>
      )}

      {/* Three-panel layout (desktop) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Field Palette — hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block w-56 border-r border-border overflow-y-auto shrink-0">
          <FieldPalette onAddField={addField} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
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
          />
        </div>

        {/* Right: Properties — hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block w-72 border-l border-border overflow-y-auto shrink-0">
          <FieldProperties field={selectedField} onUpdate={updateField} />
        </div>
      </div>
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
