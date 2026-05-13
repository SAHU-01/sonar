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
    <div className="p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">Fields</p>
      {fieldGroups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{group.label}</p>
          <div className="space-y-1">
            {group.fields.map((field) => (
              <button
                key={field.type}
                onClick={() => onAddField(field.type)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted text-sm text-left transition-colors group"
              >
                <span className="w-7 h-7 rounded bg-card border border-border flex items-center justify-center text-xs font-mono text-muted-foreground group-hover:border-accent/50 group-hover:text-accent transition-colors">
                  {field.icon}
                </span>
                <span className="text-foreground/80 group-hover:text-foreground">{field.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
