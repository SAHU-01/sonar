/**
 * FormBuilder: the main three-panel builder layout.
 * Left: FieldPalette (drag to add). Center: FormCanvas (reorder, select).
 * Right: FieldProperties (edit selected field). Top bar: form settings + save.
 */
'use client';

import { useState, useCallback } from 'react';
import { FieldPalette } from './FieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldProperties } from './FieldProperties';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectButton } from '@mysten/dapp-kit';
import { uploadBlob } from '@/lib/walrus';
import { buildCreateFormTx, PACKAGE_ID } from '@/lib/sui';
import { toast } from 'sonner';
import type { FormField, FieldType } from '@sonar/shared/schema';

export function FormBuilder() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('Untitled Form');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        version: 1,
        title: formTitle,
        description: formDescription || undefined,
        fields,
        successMessage: 'Thanks for your submission!',
        submissionLimit: 'open' as const,
        accessControl: { type: 'public' as const },
        encryption: { enabled: false },
      };

      toast.info('Uploading form schema to Walrus...');
      const blobId = await uploadBlob(JSON.stringify(schema));
      toast.success(`Schema uploaded: ${blobId.slice(0, 16)}...`);

      toast.info('Creating form on Sui...');
      const tx = buildCreateFormTx(formTitle, blobId, false);
      const result = await signAndExecute({ transaction: tx });
      toast.success(`Form created! TX: ${result.digest.slice(0, 16)}...`);
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs">S</a>
          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="bg-transparent text-lg font-semibold outline-none border-b border-transparent hover:border-border focus:border-accent transition-colors px-1"
            placeholder="Form title"
          />
        </div>
        <div className="flex items-center gap-3">
          <ConnectButton />
          <button
            onClick={handleSave}
            disabled={isSaving || !account}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isSaving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Field Palette */}
        <div className="w-56 border-r border-border overflow-y-auto shrink-0">
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

        {/* Right: Properties */}
        <div className="w-72 border-l border-border overflow-y-auto shrink-0">
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
