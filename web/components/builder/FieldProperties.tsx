/**
 * FieldProperties: right panel of the form builder. Shows editable properties
 * for the currently selected field (label, help text, required, options, validation).
 */
'use client';

import { useState } from 'react';
import type { FormField, FieldType, ValidationRule } from '@sonar/shared/schema';

interface FieldPropertiesProps {
  field: FormField | null;
  onUpdate: (id: string, updates: Partial<FormField>) => void;
}

export function FieldProperties({ field, onUpdate }: FieldPropertiesProps) {
  if (!field) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground text-center">Select a field to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Properties</p>

      {/* Label */}
      <PropertyGroup label="Label">
        <input
          value={field.label}
          onChange={(e) => onUpdate(field.id, { label: e.target.value })}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
        />
      </PropertyGroup>

      {/* Help text */}
      <PropertyGroup label="Help text">
        <input
          value={field.helpText ?? ''}
          onChange={(e) => onUpdate(field.id, { helpText: e.target.value || undefined })}
          placeholder="Optional helper text"
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
        />
      </PropertyGroup>

      {/* Placeholder */}
      {hasPlaceholder(field.type) && (
        <PropertyGroup label="Placeholder">
          <input
            value={field.placeholder ?? ''}
            onChange={(e) => onUpdate(field.id, { placeholder: e.target.value || undefined })}
            placeholder="Placeholder text"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
          />
        </PropertyGroup>
      )}

      {/* Required toggle */}
      {field.type !== 'section_header' && field.type !== 'description_block' && (
        <PropertyGroup label="Required">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
              className="accent-accent w-4 h-4"
            />
            <span className="text-sm">This field is required</span>
          </label>
        </PropertyGroup>
      )}

      {/* Options (for choice fields) */}
      {hasOptions(field.type) && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onUpdate(field.id, { options })}
        />
      )}

      {/* Star rating config */}
      {field.type === 'star_rating' && (
        <PropertyGroup label="Max rating">
          <select
            value={(field.config?.maxRating as number) ?? 5}
            onChange={(e) => onUpdate(field.id, { config: { ...field.config, maxRating: Number(e.target.value) } })}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n} stars</option>
            ))}
          </select>
        </PropertyGroup>
      )}

      {/* Validation rules */}
      {hasValidation(field.type) && (
        <ValidationEditor field={field} onUpdate={onUpdate} />
      )}
    </div>
  );
}

function PropertyGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const [newOption, setNewOption] = useState('');

  return (
    <PropertyGroup label="Options">
      <div className="space-y-1.5 mb-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors px-1"
            >
              {'\u2715'}
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newOption.trim()) {
              onChange([...options, newOption.trim()]);
              setNewOption('');
            }
          }}
          placeholder="Add option..."
          className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => {
            if (newOption.trim()) {
              onChange([...options, newOption.trim()]);
              setNewOption('');
            }
          }}
          className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
        >
          Add
        </button>
      </div>
    </PropertyGroup>
  );
}

function ValidationEditor({ field, onUpdate }: { field: FormField; onUpdate: (id: string, updates: Partial<FormField>) => void }) {
  const isText = ['short_text', 'long_text', 'rich_text', 'email', 'url'].includes(field.type);
  const isNumber = ['number', 'star_rating'].includes(field.type);

  return (
    <PropertyGroup label="Validation">
      <div className="space-y-2">
        {isText && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground">Min length</label>
                <input
                  type="number"
                  min={0}
                  value={getValidationValue(field, 'minLength') ?? ''}
                  onChange={(e) => setValidation(field, onUpdate, 'minLength', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-muted border border-border rounded px-2 py-1 text-sm outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground">Max length</label>
                <input
                  type="number"
                  min={0}
                  value={getValidationValue(field, 'maxLength') ?? ''}
                  onChange={(e) => setValidation(field, onUpdate, 'maxLength', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-muted border border-border rounded px-2 py-1 text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Regex pattern</label>
              <input
                value={getValidationPattern(field) ?? ''}
                onChange={(e) => setRegexValidation(field, onUpdate, e.target.value || null)}
                placeholder="e.g. ^[A-Z].*"
                className="w-full bg-muted border border-border rounded px-2 py-1 text-sm outline-none font-mono"
              />
            </div>
          </>
        )}
        {isNumber && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground">Min value</label>
              <input
                type="number"
                value={getValidationValue(field, 'min') ?? ''}
                onChange={(e) => setValidation(field, onUpdate, 'min', e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-muted border border-border rounded px-2 py-1 text-sm outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground">Max value</label>
              <input
                type="number"
                value={getValidationValue(field, 'max') ?? ''}
                onChange={(e) => setValidation(field, onUpdate, 'max', e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-muted border border-border rounded px-2 py-1 text-sm outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </PropertyGroup>
  );
}

function getValidationValue(field: FormField, type: string): number | null {
  const rule = field.validations.find((v) => v.type === type);
  return rule && 'value' in rule ? (rule.value as number) : null;
}

function getValidationPattern(field: FormField): string | null {
  const rule = field.validations.find((v) => v.type === 'regex');
  return rule && 'pattern' in rule ? (rule.pattern as string) : null;
}

function setValidation(field: FormField, onUpdate: (id: string, u: Partial<FormField>) => void, type: string, value: number | null) {
  const validations: ValidationRule[] = field.validations.filter((v) => v.type !== type);
  if (value !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validations.push({ type, value } as any);
  }
  onUpdate(field.id, { validations });
}

function setRegexValidation(field: FormField, onUpdate: (id: string, u: Partial<FormField>) => void, pattern: string | null) {
  const validations: ValidationRule[] = field.validations.filter((v) => v.type !== 'regex');
  if (pattern) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validations.push({ type: 'regex', pattern } as any);
  }
  onUpdate(field.id, { validations });
}

function hasPlaceholder(type: FieldType): boolean {
  return ['short_text', 'long_text', 'number', 'email', 'url'].includes(type);
}

function hasOptions(type: FieldType): boolean {
  return ['dropdown', 'multi_select', 'checkboxes', 'radio'].includes(type);
}

function hasValidation(type: FieldType): boolean {
  return !['section_header', 'description_block', 'image_upload', 'video_upload', 'file_upload'].includes(type);
}
