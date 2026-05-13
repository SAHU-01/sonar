/**
 * Compiles a FormField's validation config array into a runtime Zod schema.
 * Used by the form renderer to create per-field Zod schemas from the stored
 * JSON form definition. Depends on shared/schema.ts types.
 */
import { z, type ZodTypeAny } from 'zod';
import type { FormField, ValidationRule } from '@sonar/shared/schema';

export function buildFieldSchema(field: FormField): ZodTypeAny {
  let schema: ZodTypeAny;

  switch (field.type) {
    case 'short_text':
    case 'long_text':
    case 'rich_text':
      schema = z.string();
      break;
    case 'email':
      schema = z.string().email(field.validations.find(v => v.type === 'email')?.message);
      break;
    case 'url':
      schema = z.string().url(field.validations.find(v => v.type === 'url')?.message);
      break;
    case 'number':
    case 'star_rating':
      schema = z.coerce.number();
      break;
    case 'date':
      schema = z.string();
      break;
    case 'dropdown':
    case 'radio':
      schema = z.string();
      break;
    case 'multi_select':
    case 'checkboxes':
      schema = z.array(z.string());
      break;
    case 'image_upload':
    case 'video_upload':
    case 'file_upload':
      schema = z.string(); // blob ID after upload
      break;
    case 'section_header':
    case 'description_block':
      schema = z.any().optional();
      break;
    default:
      schema = z.string();
  }

  // Apply validation rules
  for (const rule of field.validations) {
    schema = applyValidationRule(schema, rule, field.type);
  }

  // Apply required/optional
  if (!field.required && field.type !== 'section_header' && field.type !== 'description_block') {
    schema = schema.optional();
  }

  return schema;
}

function applyValidationRule(schema: ZodTypeAny, rule: ValidationRule, fieldType: string): ZodTypeAny {
  switch (rule.type) {
    case 'minLength':
      if (schema instanceof z.ZodString) {
        return schema.min(rule.value, rule.message);
      }
      return schema;
    case 'maxLength':
      if (schema instanceof z.ZodString) {
        return schema.max(rule.value, rule.message);
      }
      return schema;
    case 'min':
      if (schema instanceof z.ZodNumber) {
        return schema.min(rule.value, rule.message);
      }
      return schema;
    case 'max':
      if (schema instanceof z.ZodNumber) {
        return schema.max(rule.value, rule.message);
      }
      return schema;
    case 'regex':
      if (schema instanceof z.ZodString) {
        return schema.regex(new RegExp(rule.pattern), rule.message);
      }
      return schema;
    default:
      return schema;
  }
}

export function buildFormSchema(fields: FormField[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    if (field.type === 'section_header' || field.type === 'description_block') continue;
    shape[field.id] = buildFieldSchema(field);
  }
  return z.object(shape);
}
