/**
 * FieldProperties: right panel of the form builder. Professional-grade property
 * editor with per-field-type validation controls, regex preset library,
 * conditional logic, custom error messages, and file upload constraints.
 */
'use client';

import { useState } from 'react';
import type { FormField, FieldType, ValidationRule } from '@sonar/shared/schema';

interface FieldPropertiesProps {
  field: FormField | null;
  allFields?: FormField[];
  onUpdate: (id: string, updates: Partial<FormField>) => void;
}

const INPUT_CLS = 'w-full neo-input font-bold text-sm lowercase placeholder:opacity-20';
const SMALL_INPUT_CLS = 'w-full neo-input font-bold text-xs lowercase py-1 px-2 shadow-none placeholder:opacity-20';

// Regex presets relevant to Sui/Web3 feedback platform
const REGEX_PRESETS = [
  { label: 'sui address (0x...)', pattern: '^0x[a-fA-F0-9]{64}$', hint: '64 hex chars' },
  { label: 'sui tx digest', pattern: '^[A-Za-z0-9+/=]{43,44}$', hint: 'base64 digest' },
  { label: 'package id', pattern: '^0x[a-fA-F0-9]{64}$', hint: 'hex format' },
  { label: 'discord username', pattern: '^.{2,32}$', hint: '2-32 chars' },
  { label: 'x / twitter handle', pattern: '^@?[A-Za-z0-9_]{1,15}$', hint: '@username' },
  { label: 'github username', pattern: '^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$', hint: 'alphanumeric' },
  { label: 'telegram handle', pattern: '^@?[a-zA-Z0-9_]{5,32}$', hint: '5-32 chars' },
];

export function FieldProperties({ field, allFields = [], onUpdate }: FieldPropertiesProps) {
  if (!field) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-xs font-black uppercase tracking-widest opacity-20 text-center">select a field<br />to edit properties</p>
      </div>
    );
  }

  const isLayout = field.type === 'section_header' || field.type === 'description_block';

  return (
    <div className="p-6 space-y-10">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6">field properties</p>

        <div className="space-y-6">
          {/* ── Basic ── */}
          <PropertyGroup label="label">
            <input value={field.label} onChange={(e) => onUpdate(field.id, { label: e.target.value })} className={INPUT_CLS} />
          </PropertyGroup>

          <PropertyGroup label="help text">
            <input
              value={field.helpText ?? ''}
              onChange={(e) => onUpdate(field.id, { helpText: e.target.value || undefined })}
              placeholder="displayed below the label"
              className={INPUT_CLS}
            />
          </PropertyGroup>

          {hasPlaceholder(field.type) && (
            <PropertyGroup label="placeholder">
              <input
                value={field.placeholder ?? ''}
                onChange={(e) => onUpdate(field.id, { placeholder: e.target.value || undefined })}
                placeholder="shown when empty"
                className={INPUT_CLS}
              />
            </PropertyGroup>
          )}

          {/* ── Required ── */}
          {!isLayout && (
            <PropertyGroup label="required">
              <Toggle
                checked={field.required}
                onChange={(v) => onUpdate(field.id, { required: v })}
                label="this field must be filled"
              />
            </PropertyGroup>
          )}

          {/* ── Default value ── */}
          {hasDefault(field.type) && (
            <PropertyGroup label="default value">
              <input
                value={field.defaultValue !== undefined ? String(field.defaultValue) : ''}
                onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value || undefined })}
                placeholder="pre-filled value"
                className={INPUT_CLS}
              />
            </PropertyGroup>
          )}

          {/* ── Options (choice fields) ── */}
          {hasOptions(field.type) && (
            <OptionsEditor options={field.options ?? []} onChange={(options) => onUpdate(field.id, { options })} />
          )}

          {/* ── Star rating config ── */}
          {field.type === 'star_rating' && (
            <div className="space-y-6">
              <PropertyGroup label="scale">
                <div className="flex gap-3 items-center">
                  <select
                    value={(field.config?.maxRating as number) ?? 5}
                    onChange={(e) => onUpdate(field.id, { config: { ...field.config, maxRating: Number(e.target.value) } })}
                    className={SMALL_INPUT_CLS + ' w-24 h-10'}
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n} stars</option>)}
                  </select>
                </div>
              </PropertyGroup>
              <PropertyGroup label="minimum rating">
                <input
                  type="number"
                  min={0}
                  max={(field.config?.maxRating as number) ?? 5}
                  value={getValidationValue(field, 'min') ?? ''}
                  onChange={(e) => setValidation(field, onUpdate, 'min', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 1 = must rate"
                  className={SMALL_INPUT_CLS + ' h-10'}
                />
              </PropertyGroup>
            </div>
          )}

          {/* ── Upload config ── */}
          {isUpload(field.type) && (
            <UploadConfig field={field} onUpdate={onUpdate} />
          )}

          {/* ── Validation ── */}
          {!isLayout && !isUpload(field.type) && field.type !== 'star_rating' && (
            <ValidationSection field={field} onUpdate={onUpdate} />
          )}

          {/* ── Conditional logic ── */}
          {!isLayout && allFields.length > 1 && (
            <ConditionalLogic field={field} allFields={allFields} onUpdate={onUpdate} />
          )}

          {/* ── Custom error message ── */}
          {!isLayout && (
            <PropertyGroup label="custom error message">
              <input
                value={(field.config?.errorMessage as string) ?? ''}
                onChange={(e) => onUpdate(field.id, { config: { ...field.config, errorMessage: e.target.value || undefined } })}
                placeholder="shown when validation fails"
                className={INPUT_CLS}
              />
            </PropertyGroup>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function PropertyGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest opacity-30 block ml-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-4 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-all border-2 border-border-strong shadow-brutal-sm ${checked ? 'bg-cta' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white border-2 border-border-strong transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </button>
      <span className="text-sm font-bold lowercase opacity-60 group-hover:opacity-100 transition-opacity">{label}</span>
    </label>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const [newOption, setNewOption] = useState('');

  return (
    <PropertyGroup label="options">
      <div className="space-y-2 mb-4">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                onChange(next);
              }}
              className={'flex-1 ' + SMALL_INPUT_CLS + ' h-10'}
            />
            <button
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="w-10 h-10 neo-card flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition-all shadow-brutal-sm shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" /></svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newOption.trim()) { onChange([...options, newOption.trim()]); setNewOption(''); } }}
          placeholder="add option..."
          className={'flex-1 ' + SMALL_INPUT_CLS + ' h-10'}
        />
        <button
          onClick={() => { if (newOption.trim()) { onChange([...options, newOption.trim()]); setNewOption(''); } }}
          className="neo-btn-cta text-cta-foreground px-4 h-10 text-xs"
        >
          + add
        </button>
      </div>
    </PropertyGroup>
  );
}

function ValidationSection({ field, onUpdate }: { field: FormField; onUpdate: (id: string, u: Partial<FormField>) => void }) {
  const [showPresets, setShowPresets] = useState(false);
  const isText = ['short_text', 'long_text', 'rich_text'].includes(field.type);
  const isEmail = field.type === 'email';
  const isUrl = field.type === 'url';
  const isNumber = field.type === 'number';
  const isDate = field.type === 'date';
  const isChoice = ['multi_select', 'checkboxes'].includes(field.type);

  return (
    <PropertyGroup label="validation">
      <div className="space-y-4">
        {/* Text: length */}
        {(isText || isEmail || isUrl) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">min len</label>
              <input
                type="number" min={0}
                value={getValidationValue(field, 'minLength') ?? ''}
                onChange={(e) => setValidation(field, onUpdate, 'minLength', e.target.value ? Number(e.target.value) : null)}
                className={SMALL_INPUT_CLS + ' h-10'}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">max len</label>
              <input
                type="number" min={0}
                value={getValidationValue(field, 'maxLength') ?? ''}
                onChange={(e) => setValidation(field, onUpdate, 'maxLength', e.target.value ? Number(e.target.value) : null)}
                className={SMALL_INPUT_CLS + ' h-10'}
              />
            </div>
          </div>
        )}

        {/* Text: regex with preset library */}
        {(isText || isEmail || isUrl) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-1">regex pattern</label>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline transition-all"
              >
                {showPresets ? 'hide presets' : 'use preset'}
              </button>
            </div>
            {showPresets && (
              <div className="neo-card bg-card border-border-strong mb-4 overflow-hidden shadow-brutal-sm">
                {REGEX_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => { setRegexValidation(field, onUpdate, preset.pattern); setShowPresets(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-cta hover:text-cta-foreground transition-colors border-b-2 border-border-strong/10 last:border-b-0 font-bold lowercase"
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            )}
            <input
              value={getValidationPattern(field) ?? ''}
              onChange={(e) => setRegexValidation(field, onUpdate, e.target.value || null)}
              placeholder="e.g. ^0x[a-fA-F0-9]{64}$"
              className={SMALL_INPUT_CLS + ' h-10 font-mono'}
            />
          </div>
        )}

        {/* Number: min/max/step/integer */}
        {isNumber && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">min value</label>
                <input
                  type="number"
                  value={getValidationValue(field, 'min') ?? ''}
                  onChange={(e) => setValidation(field, onUpdate, 'min', e.target.value ? Number(e.target.value) : null)}
                  className={SMALL_INPUT_CLS + ' h-10'}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">max value</label>
                <input
                  type="number"
                  value={getValidationValue(field, 'max') ?? ''}
                  onChange={(e) => setValidation(field, onUpdate, 'max', e.target.value ? Number(e.target.value) : null)}
                  className={SMALL_INPUT_CLS + ' h-10'}
                />
              </div>
            </div>
            <Toggle
              checked={!!field.config?.integerOnly}
              onChange={(v) => onUpdate(field.id, { config: { ...field.config, integerOnly: v || undefined } })}
              label="integer only (no decimals)"
            />
          </div>
        )}

        {/* Date: constraints */}
        {isDate && (
          <div className="space-y-4">
            <Toggle
              checked={!!field.config?.noFuture}
              onChange={(v) => onUpdate(field.id, { config: { ...field.config, noFuture: v || undefined } })}
              label="no future dates"
            />
            <Toggle
              checked={!!field.config?.noPast}
              onChange={(v) => onUpdate(field.id, { config: { ...field.config, noPast: v || undefined } })}
              label="no past dates"
            />
          </div>
        )}

        {/* Multi-select / checkboxes: min/max selections */}
        {isChoice && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">min choices</label>
              <input
                type="number" min={0}
                value={(field.config?.minSelections as number) ?? ''}
                onChange={(e) => onUpdate(field.id, { config: { ...field.config, minSelections: e.target.value ? Number(e.target.value) : undefined } })}
                className={SMALL_INPUT_CLS + ' h-10'}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">max choices</label>
              <input
                type="number" min={0}
                value={(field.config?.maxSelections as number) ?? ''}
                onChange={(e) => onUpdate(field.id, { config: { ...field.config, maxSelections: e.target.value ? Number(e.target.value) : undefined } })}
                className={SMALL_INPUT_CLS + ' h-10'}
              />
            </div>
          </div>
        )}
      </div>
    </PropertyGroup>
  );
}

function UploadConfig({ field, onUpdate }: { field: FormField; onUpdate: (id: string, u: Partial<FormField>) => void }) {
  const isImage = field.type === 'image_upload';
  const isVideo = field.type === 'video_upload';

  return (
    <PropertyGroup label="upload constraints">
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">max size (mb)</label>
          <input
            type="number" min={1} max={10}
            value={(field.config?.maxSizeMB as number) ?? (isVideo ? 10 : 5)}
            onChange={(e) => onUpdate(field.id, { config: { ...field.config, maxSizeMB: Number(e.target.value) } })}
            className={SMALL_INPUT_CLS + ' w-24 h-10'}
          />
        </div>
        {(isImage || isVideo) && (
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-1">accepted formats</label>
            <div className="flex flex-wrap gap-2">
              {(isImage ? ['JPEG', 'PNG', 'WebP', 'GIF', 'SVG'] : ['MP4', 'WebM', 'MOV']).map((fmt) => {
                const current = ((field.config?.acceptedFormats as string[]) ?? (isImage ? ['JPEG', 'PNG', 'WebP'] : ['MP4', 'WebM']));
                const active = current.includes(fmt);
                return (
                  <button
                    key={fmt}
                    onClick={() => {
                      const next = active ? current.filter(f => f !== fmt) : [...current, fmt];
                      onUpdate(field.id, { config: { ...field.config, acceptedFormats: next } });
                    }}
                    className={`text-[10px] px-3 py-1.5 rounded-full border-2 font-black tracking-widest transition-all shadow-brutal-sm ${active ? 'bg-cta border-border-strong text-cta-foreground' : 'bg-card border-border text-muted-foreground opacity-50 hover:opacity-100'}`}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PropertyGroup>
  );
}

function ConditionalLogic({ field, allFields, onUpdate }: { field: FormField; allFields: FormField[]; onUpdate: (id: string, u: Partial<FormField>) => void }) {
  const otherFields = allFields.filter(f => f.id !== field.id && !['section_header', 'description_block'].includes(f.type));
  const hasCondition = !!field.conditional;

  return (
    <PropertyGroup label="conditional logic">
      <Toggle
        checked={hasCondition}
        onChange={(v) => {
          if (v && otherFields.length > 0) {
            onUpdate(field.id, { conditional: { fieldId: otherFields[0].id, equals: '' } });
          } else {
            onUpdate(field.id, { conditional: undefined });
          }
        }}
        label="show only when..."
      />
      {hasCondition && field.conditional && (
        <div className="mt-4 space-y-4 pl-4 border-l-4 border-cta ml-1">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">if field</label>
            <select
              value={field.conditional.fieldId}
              onChange={(e) => onUpdate(field.id, { conditional: { ...field.conditional!, fieldId: e.target.value } })}
              className={SMALL_INPUT_CLS + ' h-10'}
            >
              {otherFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 block ml-1">equals value</label>
            <input
              value={String(field.conditional.equals ?? '')}
              onChange={(e) => onUpdate(field.id, { conditional: { ...field.conditional!, equals: e.target.value } })}
              placeholder="value to match"
              className={SMALL_INPUT_CLS + ' h-10'}
            />
          </div>
        </div>
      )}
    </PropertyGroup>
  );
}

// ── Helpers ──

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (value !== null) validations.push({ type, value } as any);
  onUpdate(field.id, { validations });
}

function setRegexValidation(field: FormField, onUpdate: (id: string, u: Partial<FormField>) => void, pattern: string | null) {
  const validations: ValidationRule[] = field.validations.filter((v) => v.type !== 'regex');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (pattern) validations.push({ type: 'regex', pattern } as any);
  onUpdate(field.id, { validations });
}

function hasPlaceholder(type: FieldType): boolean {
  return ['short_text', 'long_text', 'number', 'email', 'url'].includes(type);
}

function hasDefault(type: FieldType): boolean {
  return ['short_text', 'long_text', 'number', 'email', 'url', 'dropdown', 'radio'].includes(type);
}

function hasOptions(type: FieldType): boolean {
  return ['dropdown', 'multi_select', 'checkboxes', 'radio'].includes(type);
}

function isUpload(type: FieldType): boolean {
  return ['image_upload', 'video_upload', 'file_upload'].includes(type);
}
