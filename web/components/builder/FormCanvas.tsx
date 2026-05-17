/**
 * FormCanvas: center panel. Renders all form fields in order.
 * Supports selection, reorder (up/down buttons), delete with confirmation, duplicate.
 * X button is always visible on every field card for quick removal.
 */
'use client';

import type { FormField } from '@sonar/shared/schema';
import { SonarMascot } from '@/components/SonarMascot';

interface FormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onMoveField: (from: number, to: number) => void;
  onRemoveField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  formTitle: string;
  formDescription: string;
  onDescriptionChange: (desc: string) => void;
  isPublished?: boolean;
}

export function FormCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onMoveField,
  onRemoveField,
  onDuplicateField,
  formTitle,
  formDescription,
  onDescriptionChange,
  isPublished,
}: FormCanvasProps) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      {/* Form header */}
      <div className="mb-12">
        <input
          value={formTitle}
          onChange={(e) => {
             // We need to pass this up or handle it. 
             // Actually, the user can just edit it in the top bar, 
             // but if they want it here too, we should sync it.
             // Since it's passed as a prop, we should probably have an onTitleChange too.
          }}
          readOnly // For now, since it's managed in the top bar, but let's make it look like a title.
          className="w-full bg-transparent text-3xl sm:text-4xl mb-4 leading-tight font-black outline-none border-none placeholder:opacity-30"
          placeholder="untitled form"
        />
        <textarea
          value={formDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="add a description..."
          className="w-full bg-transparent text-lg font-bold opacity-60 outline-none resize-none lowercase placeholder:opacity-30"
          rows={2}
        />
      </div>

      {/* Fields */}
      {fields.length === 0 ? (
        <div className="neo-card border-dashed border-4 border-border-strong/20 p-20 flex flex-col items-center gap-8 shadow-none bg-card/10">
          <SonarMascot mood="idle" size="lg" message="add some fields to get started!" />
          <p className="font-black text-xs uppercase tracking-widest opacity-20">click a field type on the left panel</p>
        </div>
      ) : (
        <div className="space-y-6">
          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              total={fields.length}
              isSelected={field.id === selectedFieldId}
              isPublished={isPublished}
              onSelect={() => onSelectField(field.id)}
              onMoveUp={() => onMoveField(index, index - 1)}
              onMoveDown={() => onMoveField(index, index + 1)}
              onRemove={() => onRemoveField(field.id)}
              onDuplicate={() => onDuplicateField(field.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldCard({
  field,
  index,
  total,
  isSelected,
  isPublished,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDuplicate,
}: {
  field: FormField;
  index: number;
  total: number;
  isSelected: boolean;
  isPublished?: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPublished) {
      const confirmed = window.confirm(
        `Delete "${field.label}"?\n\nThis form is already published. Removing this field means existing submissions may reference a field that no longer exists. The change will take effect when you publish a new version.`
      );
      if (!confirmed) return;
    }
    onRemove();
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative neo-card p-8 cursor-pointer transition-all ${
        isSelected ? 'bg-card border-border-warm shadow-[6px_6px_0px_0px_var(--border-warm)]' : 'bg-card/80 hover:bg-card hover:-translate-y-1'
      }`}
    >
      {/* Always-visible X button — top right */}
      <button
        onClick={handleRemove}
        className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-card border-2 border-border-strong flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white transition-all z-10 shadow-brutal-sm"
        title="Remove field"
      >
        <svg width="16" height="16" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>

      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{fieldTypeLabel(field.type)}</span>
            {field.required && <span className="text-destructive font-black text-[10px] uppercase tracking-widest">required</span>}
          </div>
          <p className="text-xl font-black lowercase tracking-tight">{field.label}</p>
          {field.helpText && <p className="text-sm font-bold opacity-50 lowercase mt-1 leading-tight">{field.helpText}</p>}

          {/* Field preview */}
          <div className="mt-6 opacity-60 pointer-events-none grayscale-[0.5]">
            <FieldPreview field={field} />
          </div>
        </div>

        {/* Reorder + duplicate actions — visible when selected */}
        {isSelected && (
          <div className="flex flex-col gap-2 shrink-0">
            <ActionBtn onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} title="Move up">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 11V3M3 7l4-4 4 4" />
              </svg>
            </ActionBtn>
            <ActionBtn onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1} title="Move down">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3v8M3 7l4 4 4-4" />
              </svg>
            </ActionBtn>
            <ActionBtn onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="7" height="7" rx="1.5" />
                <path d="M9 5V3.5A1.5 1.5 0 007.5 2h-4A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5" />
              </svg>
            </ActionBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, title, children }: { onClick: (e: React.MouseEvent) => void; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-10 h-10 neo-card flex items-center justify-center text-foreground transition-all disabled:opacity-10 hover:bg-cta hover:text-cta-foreground shadow-brutal-sm"
    >
      {children}
    </button>
  );
}

function FieldPreview({ field }: { field: FormField }) {
  const cls = 'w-full neo-input font-bold text-sm lowercase';

  switch (field.type) {
    case 'short_text':
    case 'email':
    case 'url':
      return <input type="text" disabled placeholder={field.placeholder || `enter ${field.label.toLowerCase()}...`} className={cls} />;
    case 'long_text':
      return <textarea disabled placeholder={field.placeholder || 'enter text...'} rows={3} className={`${cls} resize-none`} />;
    case 'number':
      return <input type="number" disabled placeholder="0" className="w-40 neo-input font-bold text-sm" />;
    case 'date':
      return <input type="date" disabled className="w-56 neo-input font-bold text-sm" />;
    case 'dropdown':
      return (
        <select disabled className={cls}>
          <option>select an option...</option>
          {(field.options ?? []).map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-3">
          {(field.options ?? ['option 1', 'option 2']).map((o) => (
            <label key={o} className="flex items-center gap-3 text-sm font-bold lowercase opacity-70">
              <div className="w-5 h-5 rounded-full border-2 border-border-strong" />{o}
            </label>
          ))}
        </div>
      );
    case 'checkboxes':
    case 'multi_select':
      return (
        <div className="space-y-3">
          {(field.options ?? ['option 1', 'option 2']).map((o) => (
            <label key={o} className="flex items-center gap-3 text-sm font-bold lowercase opacity-70">
              <div className="w-5 h-5 rounded-md border-2 border-border-strong" />{o}
            </label>
          ))}
        </div>
      );
    case 'star_rating': {
      const max = (field.config?.maxRating as number) ?? 5;
      return (
        <div className="flex gap-2">
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className="text-3xl opacity-20">&#9733;</span>
          ))}
        </div>
      );
    }
    case 'image_upload':
    case 'video_upload':
    case 'file_upload':
      return (
        <div className="neo-card bg-card-cream border-dashed border-2 border-border-strong/20 p-6 text-center shadow-none">
          <p className="text-xs font-black lowercase opacity-40">upload {field.type.replace('_upload', '')} preview</p>
        </div>
      );
    case 'section_header':
      return <div className="border-b-4 border-border-strong/10 pb-1" />;
    case 'description_block':
      return <p className="text-sm font-bold opacity-40 lowercase italic">description text will appear here</p>;
    case 'rich_text':
      return <div className="neo-card bg-card-cream p-4 text-xs font-mono font-bold opacity-40 h-20 shadow-none">markdown editor preview</div>;
    default:
      return <div className="neo-card bg-card-cream p-4 text-xs font-bold opacity-40 shadow-none lowercase">{field.type} preview</div>;
  }
}

function fieldTypeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}
