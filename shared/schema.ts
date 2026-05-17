/**
 * Shared Zod schemas and TypeScript types for the Sonar form platform.
 * Used by web (Next.js), worker, and any scripts. Defines the canonical
 * shape of form schemas, fields, validation rules, and submissions.
 */
import { z } from 'zod';

// --- Validation Rules ---

export const ValidationRuleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('minLength'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('maxLength'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('min'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('max'), value: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('regex'), pattern: z.string(), message: z.string().optional() }),
  z.object({ type: z.literal('email'), message: z.string().optional() }),
  z.object({ type: z.literal('url'), message: z.string().optional() }),
  z.object({ type: z.literal('fileType'), allowed: z.array(z.string()), message: z.string().optional() }),
  z.object({ type: z.literal('maxFileSize'), bytes: z.number(), message: z.string().optional() }),
  z.object({ type: z.literal('requiredIf'), fieldId: z.string(), equals: z.unknown(), message: z.string().optional() }),
]);

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

// --- Field Types ---

export const FieldTypeSchema = z.enum([
  'short_text', 'long_text', 'rich_text', 'dropdown', 'multi_select',
  'checkboxes', 'radio', 'star_rating', 'number', 'url', 'email', 'date',
  'image_upload', 'video_upload', 'file_upload', 'section_header', 'description_block',
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

// --- Form Field ---

export const FormFieldSchema = z.object({
  id: z.string(),
  type: FieldTypeSchema,
  label: z.string(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  options: z.array(z.string()).optional(),
  validations: z.array(ValidationRuleSchema).default([]),
  conditional: z.object({ fieldId: z.string(), equals: z.unknown() }).optional(),
  config: z.record(z.unknown()).optional(),
});

export type FormField = z.infer<typeof FormFieldSchema>;

// --- Form Schema (the full form definition stored on Walrus) ---

export const FormSchema = z.object({
  version: z.number(),
  title: z.string(),
  description: z.string().optional(),
  bannerImageBlobId: z.string().optional(),
  fields: z.array(FormFieldSchema),
  successMessage: z.string().default('Thanks for your submission!'),
  redirectUrl: z.string().url().optional(),
  submissionLimit: z.enum(['per_wallet', 'open']).default('open'),
  allowEditing: z.boolean().default(false),
  closeDate: z.string().datetime().optional(),
  accessControl: z.object({
    type: z.enum(['public', 'wallet_gated', 'nft_gated', 'allowlist']),
    value: z.string().optional(),
  }).default({ type: 'public' }),
  branding: z.object({
    logoBlobId: z.string().optional(),
    accentColor: z.string().optional(),
  }).optional(),
  encryption: z.object({
    enabled: z.boolean().default(false),
    policyPackageId: z.string().optional(),
    policyModule: z.string().optional(),
  }).default({ enabled: false }),
});

export type FormSchemaType = z.infer<typeof FormSchema>;

// --- Submission ---

export const SubmissionSchema = z.object({
  formId: z.string(),
  formVersion: z.number(),
  data: z.record(z.unknown()),
  submittedAt: z.string().datetime(),
  submitterWallet: z.string().optional(),
  encrypted: z.boolean().default(false),
});

export type Submission = z.infer<typeof SubmissionSchema>;

// --- Batch (for Walrus + Sui commitment) ---

export const BatchSchema = z.object({
  formId: z.string(),
  submissions: z.array(SubmissionSchema),
  merkleRoot: z.string(),
  createdAt: z.string().datetime(),
});

export type Batch = z.infer<typeof BatchSchema>;
