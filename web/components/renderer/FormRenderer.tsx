/**
 * FormRenderer: renders a form schema fetched from Walrus. Uses react-hook-form
 * with Zod resolver for validation. Submits responses to Walrus and records on Sui.
 */
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildFormSchema } from '@/lib/zod-builder';
import { uploadBlob } from '@/lib/walrus';
import { buildRecordSubmissionTx, PACKAGE_ID } from '@/lib/sui';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectButton } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import type { FormSchemaType, FormField } from '@sonar/shared/schema';

interface FormRendererProps {
  schema: FormSchemaType;
  formObjectId: string;
}

export function FormRenderer({ schema, formObjectId }: FormRendererProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const zodSchema = buildFormSchema(schema.fields);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
  });

  const needsWallet = schema.accessControl?.type !== 'public';

  const onSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const submission = {
        formId: formObjectId,
        formVersion: schema.version,
        data,
        submittedAt: new Date().toISOString(),
        submitterWallet: account?.address,
        encrypted: false,
      };

      toast.info('Uploading response to Walrus...');
      const blobId = await uploadBlob(JSON.stringify(submission));

      if (account && PACKAGE_ID) {
        toast.info('Recording on Sui...');
        const tx = buildRecordSubmissionTx(formObjectId, blobId, false, schema.version);
        await signAndExecute({ transaction: tx });
        toast.success('Response submitted and recorded on-chain!');
      } else {
        toast.success('Response submitted to Walrus!');
      }

      setSubmitted(true);
    } catch (err) {
      toast.error(`Submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl">{'\u2713'}</div>
          <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
          <p className="text-muted-foreground">{schema.successMessage ?? 'Your response has been submitted.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{schema.title}</h1>
          {schema.description && <p className="text-muted-foreground">{schema.description}</p>}
        </div>

        {/* Wallet connect (if required) */}
        {needsWallet && !account && (
          <div className="mb-6 bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">This form requires a wallet connection</p>
            <ConnectButton />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {schema.fields.map((field) => (
            <RenderField key={field.id} field={field} register={register} errors={errors} />
          ))}

          <button
            type="submit"
            disabled={isSubmitting || (needsWallet && !account)}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by <a href="/" className="text-accent hover:underline">Sonar</a> — stored on Walrus
        </p>
      </div>
    </div>
  );
}

function RenderField({
  field,
  register,
  errors,
}: {
  field: FormField;
  register: ReturnType<typeof useForm>['register'];
  errors: Record<string, { message?: string } | undefined>;
}) {
  const error = errors[field.id];

  if (field.type === 'section_header') {
    return (
      <div className="pt-4">
        <h3 className="text-lg font-semibold">{field.label}</h3>
        {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
      </div>
    );
  }

  if (field.type === 'description_block') {
    return <p className="text-sm text-muted-foreground">{field.label}</p>;
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.helpText && <p className="text-xs text-muted-foreground mb-2">{field.helpText}</p>}

      {renderInput(field, register)}

      {error?.message && (
        <p className="text-xs text-red-400 mt-1.5">{error.message}</p>
      )}
    </div>
  );
}

function renderInput(field: FormField, register: ReturnType<typeof useForm>['register']) {
  const cls = 'w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-colors';

  switch (field.type) {
    case 'short_text':
      return <input {...register(field.id)} placeholder={field.placeholder} className={cls} />;
    case 'long_text':
      return <textarea {...register(field.id)} placeholder={field.placeholder} rows={4} className={`${cls} resize-none`} />;
    case 'email':
      return <input type="email" {...register(field.id)} placeholder={field.placeholder || 'email@example.com'} className={cls} />;
    case 'url':
      return <input type="url" {...register(field.id)} placeholder={field.placeholder || 'https://'} className={cls} />;
    case 'number':
      return <input type="number" {...register(field.id)} placeholder={field.placeholder || '0'} className={cls} />;
    case 'date':
      return <input type="date" {...register(field.id)} className={cls} />;
    case 'dropdown':
      return (
        <select {...register(field.id)} className={cls}>
          <option value="">Select...</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" {...register(field.id)} value={o} className="accent-accent w-4 h-4" />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      );
    case 'checkboxes':
    case 'multi_select':
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register(field.id)} value={o} className="accent-accent w-4 h-4" />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      );
    case 'star_rating': {
      const max = (field.config?.maxRating as number) ?? 5;
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => (
            <label key={i} className="cursor-pointer">
              <input type="radio" {...register(field.id)} value={String(i + 1)} className="sr-only" />
              <span className="text-2xl hover:text-accent transition-colors text-muted-foreground/40">{'\u2605'}</span>
            </label>
          ))}
        </div>
      );
    }
    case 'image_upload':
    case 'video_upload':
    case 'file_upload':
      return (
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">File upload coming soon</p>
        </div>
      );
    case 'rich_text':
      return <textarea {...register(field.id)} placeholder="Markdown supported..." rows={6} className={`${cls} font-mono resize-none`} />;
    default:
      return <input {...register(field.id)} className={cls} />;
  }
}
