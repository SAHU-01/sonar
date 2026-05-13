/**
 * Compiles a FormField's validation config array into a runtime Zod schema.
 * Used by the form renderer to create per-field Zod schemas from the stored
 * JSON form definition.
 */
import { z, type ZodTypeAny } from 'zod';
import type { FormField } from '@sonar/shared/schema';

type BaseType = 'string' | 'number' | 'array' | 'any';

export function buildFieldSchema(field: FormField): ZodTypeAny {
  let baseType: BaseType;
  let schema: ZodTypeAny;

  switch (field.type) {
    case 'short_text':
    case 'long_text':
    case 'rich_text':
    case 'date':
    case 'dropdown':
    case 'radio':
    case 'image_upload':
    case 'video_upload':
    case 'file_upload': {
      let s = z.string();
      baseType = 'string';
      for (const rule of field.validations) {
        if (rule.type === 'minLength') s = s.min(rule.value, rule.message);
        else if (rule.type === 'maxLength') s = s.max(rule.value, rule.message);
        else if (rule.type === 'regex') s = s.regex(new RegExp(rule.pattern), rule.message);
      }
      schema = s;
      break;
    }
    case 'email': {
      let s = z.string().email();
      baseType = 'string';
      for (const rule of field.validations) {
        if (rule.type === 'minLength') s = s.min(rule.value, rule.message);
        else if (rule.type === 'maxLength') s = s.max(rule.value, rule.message);
      }
      schema = s;
      break;
    }
    case 'url': {
      let s = z.string().url();
      baseType = 'string';
      for (const rule of field.validations) {
        if (rule.type === 'minLength') s = s.min(rule.value, rule.message);
        else if (rule.type === 'maxLength') s = s.max(rule.value, rule.message);
      }
      schema = s;
      break;
    }
    case 'number':
    case 'star_rating': {
      let s = z.coerce.number();
      baseType = 'number';
      for (const rule of field.validations) {
        if (rule.type === 'min') s = s.min(rule.value, rule.message);
        else if (rule.type === 'max') s = s.max(rule.value, rule.message);
      }
      schema = s;
      break;
    }
    case 'multi_select':
    case 'checkboxes':
      schema = z.array(z.string());
      baseType = 'array';
      break;
    case 'section_header':
    case 'description_block':
      schema = z.any().optional();
      baseType = 'any';
      break;
    default:
      schema = z.string();
      baseType = 'string';
  }

  if (!field.required && baseType !== 'any') {
    if (baseType === 'string') {
      // Allow empty string for optional string fields
      schema = schema.optional().or(z.literal(''));
    } else {
      schema = schema.optional();
    }
  }

  return schema;
}

export function buildFormSchema(fields: FormField[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    if (field.type === 'section_header' || field.type === 'description_block') continue;
    shape[field.id] = buildFieldSchema(field);
  }
  return z.object(shape);
}
