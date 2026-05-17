/**
 * FieldPalette: left panel of the form builder. Shows all available field types
 * grouped by category. Click to add a field to the form.
 */
'use client';

import type { FieldType } from '@sonar/shared/schema';

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
}

const fieldGroups: { label: string; fields: { type: FieldType; label: string; icon: string }[] }[] = [
  {
    label: 'Text',
    fields: [
      { type: 'short_text', label: 'Short text', icon: 'Aa' },
      { type: 'long_text', label: 'Long text', icon: '|=' },
      { type: 'rich_text', label: 'Rich text', icon: 'Md' },
    ],
  },
  {
    label: 'Choice',
    fields: [
      { type: 'dropdown', label: 'Dropdown', icon: '\u25BE' },
      { type: 'multi_select', label: 'Multi select', icon: '\u2611' },
      { type: 'checkboxes', label: 'Checkboxes', icon: '\u2610' },
      { type: 'radio', label: 'Radio', icon: '\u25CB' },
    ],
  },
  {
    label: 'Input',
    fields: [
      { type: 'star_rating', label: 'Star rating', icon: '\u2605' },
      { type: 'number', label: 'Number', icon: '#' },
      { type: 'email', label: 'Email', icon: '@' },
      { type: 'url', label: 'URL', icon: '\u26AD' },
      { type: 'date', label: 'Date', icon: '\u2609' },
    ],
  },
  {
    label: 'Upload',
    fields: [
      { type: 'image_upload', label: 'Image', icon: '\u25A3' },
      { type: 'video_upload', label: 'Video', icon: '\u25B6' },
      { type: 'file_upload', label: 'File', icon: '\u2B06' },
    ],
  },
  {
    label: 'Layout',
    fields: [
      { type: 'section_header', label: 'Section header', icon: 'H' },
      { type: 'description_block', label: 'Description', icon: '\u00B6' },
    ],
  },
];

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="space-y-8 py-6 px-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6 px-1">field palette</p>
        <div className="space-y-6">
          {fieldGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-20 mb-2 px-1">{group.label}</p>
              <div className="grid grid-cols-1 gap-2">
                {group.fields.map((field) => (
                  <button
                    key={field.type}
                    onClick={() => onAddField(field.type)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 border-transparent hover:border-border-strong hover:bg-card transition-all group text-left"
                  >
                    <span className="w-8 h-8 rounded-lg bg-card border-2 border-border-strong flex items-center justify-center text-xs font-black shadow-brutal-sm group-hover:bg-cta group-hover:text-cta-foreground group-hover:shadow-none transition-all">
                      {field.icon}
                    </span>
                    <span className="text-sm font-bold lowercase opacity-70 group-hover:opacity-100">{field.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
