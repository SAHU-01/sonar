/**
 * FormCanvas: center panel. Renders all form fields in order.
 * Supports selection, reorder (up/down buttons), delete, duplicate.
 */
'use client';

import type { FormField } from '@sonar/shared/schema';

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
}: FormCanvasProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      {/* Form header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{formTitle}</h1>
        <textarea
          value={formDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          className="w-full bg-transparent text-sm text-muted-foreground outline-none resize-none"
          rows={2}
        />
      </div>

      {/* Fields */}
      {fields.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">Click a field type on the left to add it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              total={fields.length}
              isSelected={field.id === selectedFieldId}
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
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${
        isSelected ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono">{fieldTypeLabel(field.type)}</span>
            {field.required && <span className="text-red-400 text-xs">required</span>}
          </div>
          <p className="font-medium text-sm">{field.label}</p>
          {field.helpText && <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>}

          {/* Field preview */}
          <div className="mt-3">
            <FieldPreview field={field} />
          </div>
        </div>

        {/* Actions */}
        {isSelected && (
          <div className="flex items-center gap-1 shrink-0">
            <ActionBtn onClick={onMoveUp} disabled={index === 0} label="\u2191" />
            <ActionBtn onClick={onMoveDown} disabled={index === total - 1} label="\u2193" />
            <ActionBtn onClick={onDuplicate} label="\u2398" />
            <ActionBtn onClick={(e) => { e.stopPropagation(); onRemove(); }} label="\u2715" danger />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, label, danger }: { onClick: (e: React.MouseEvent) => void; disabled?: boolean; label: string; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      disabled={disabled}
      className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-colors disabled:opacity-30 ${
        danger ? 'hover:bg-red-500/20 hover:text-red-400' : 'hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
}

function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case 'short_text':
    case 'email':
    case 'url':
      return <input type="text" disabled placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground" />;
    case 'long_text':
      return <textarea disabled placeholder={field.placeholder || 'Enter text...'} rows={3} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground resize-none" />;
    case 'number':
      return <input type="number" disabled placeholder="0" className="w-32 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground" />;
    case 'date':
      return <input type="date" disabled className="w-48 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground" />;
    case 'dropdown':
      return (
        <select disabled className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
          <option>Select an option...</option>
          {(field.options ?? []).map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-1.5">
          {(field.options ?? ['Option 1', 'Option 2']).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="radio" disabled className="accent-accent" />{o}
            </label>
          ))}
        </div>
      );
    case 'checkboxes':
    case 'multi_select':
      return (
        <div className="space-y-1.5">
          {(field.options ?? ['Option 1', 'Option 2']).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" disabled className="accent-accent" />{o}
            </label>
          ))}
        </div>
      );
    case 'star_rating': {
      const max = (field.config?.maxRating as number) ?? 5;
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className="text-xl text-muted-foreground/40">{'\u2605'}</span>
          ))}
        </div>
      );
    }
    case 'image_upload':
    case 'video_upload':
    case 'file_upload':
      return (
        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">Click or drag to upload {field.type.replace('_upload', '')}</p>
        </div>
      );
    case 'section_header':
      return <div className="border-b border-border pb-1" />;
    case 'description_block':
      return <p className="text-sm text-muted-foreground italic">Description text will appear here</p>;
    case 'rich_text':
      return <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground h-20">Markdown editor</div>;
    default:
      return <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">{field.type}</div>;
  }
}

function fieldTypeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}
