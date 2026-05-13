/**
 * FormRenderer: renders a form schema fetched from Walrus. Uses react-hook-form
 * with Zod resolver for validation. Submits responses to Walrus and records on Sui.
 * Supports conditional fields, file uploads to Walrus, interactive star rating.
 */
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildFormSchema } from '@/lib/zod-builder';
import { uploadBlob } from '@/lib/walrus';
import { buildRecordSubmissionTx, PACKAGE_ID } from '@/lib/sui';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectButton } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { WalrusUpload } from './fields/WalrusUpload';
import { StarRating } from './fields/StarRating';
import type { FormSchemaType, FormField } from '@sonar/shared/schema';

interface FormRendererProps {
  schema: FormSchemaType;
  formObjectId: string;
  embed?: boolean;
}

export function FormRenderer({ schema, formObjectId, embed }: FormRendererProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const zodSchema = buildFormSchema(schema.fields);
  const { register, handleSubmit, formState: { errors }, watch, control, setValue } = useForm({
    resolver: zodResolver(zodSchema),
  });

  const watchedValues = watch();
  const needsWallet = schema.accessControl?.type !== 'public';

  const isEncrypted = schema.encryption?.enabled ?? false;

  const onSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const submission = {
        formId: formObjectId,
        formVersion: schema.version,
        data,
        submittedAt: new Date().toISOString(),
        submitterWallet: account?.address,
        encrypted: isEncrypted,
      };

      const jsonBytes = new TextEncoder().encode(JSON.stringify(submission));
      let uploadBytes: Uint8Array | string = jsonBytes;

      if (isEncrypted) {
        toast.info('Encrypting response with Seal...');
        try {
          const { encryptSubmission } = await import('@/lib/seal');
          const config = {
            suiClient: (await import('@/lib/sui')).suiClient,
            packageId: schema.encryption!.policyPackageId!,
            policyModule: schema.encryption!.policyModule!,
            keyServerObjectIds: (process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_IDS ?? '').split(',').filter(Boolean),
            threshold: Number(process.env.NEXT_PUBLIC_SEAL_THRESHOLD ?? 2),
          };
          const { encryptedData } = await encryptSubmission(jsonBytes, formObjectId, config);
          uploadBytes = encryptedData;
          toast.success('Encrypted!');
        } catch (encErr) {
          console.error('Encryption failed, submitting plaintext:', encErr);
          toast.warning('Encryption unavailable — submitting plaintext');
        }
      }

      toast.info('Uploading response to Walrus...');
      const blobId = await uploadBlob(uploadBytes);

      if (account && PACKAGE_ID) {
        toast.info('Recording on Sui...');
        const tx = buildRecordSubmissionTx(formObjectId, blobId, isEncrypted, schema.version);
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
      <div className={`${embed ? 'py-12' : 'min-h-screen'} flex items-center justify-center px-6`}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl">{'\u2713'}</div>
          <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
          <p className="text-muted-foreground">{schema.successMessage ?? 'Your response has been submitted.'}</p>
        </div>
      </div>
    );
  }

  // Filter visible fields based on conditional logic
  const visibleFields = schema.fields.filter((field) => {
    if (!field.conditional) return true;
    const depValue = watchedValues[field.conditional.fieldId];
    return depValue === field.conditional.equals;
  });

  return (
    <div className={`${embed ? 'py-8' : 'min-h-screen py-12'} flex justify-center px-6`}>
      <div className="w-full max-w-xl">
        {/* Header */}
        {!embed && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{schema.title}</h1>
            {schema.description && <p className="text-muted-foreground">{schema.description}</p>}
          </div>
        )}

        {needsWallet && !account && (
          <div className="mb-6 bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">This form requires a wallet connection</p>
            <ConnectButton />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {visibleFields.map((field) => (
            <RenderField
              key={field.id}
              field={field}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          ))}

          <button
            type="submit"
            disabled={isSubmitting || (needsWallet && !account)}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
            style={schema.branding?.accentColor ? { backgroundColor: schema.branding.accentColor } : undefined}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {!embed && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            Powered by <a href="/" className="text-accent hover:underline">Sonar</a> — stored on Walrus
          </p>
        )}
      </div>
    </div>
  );
}

function RenderField({
  field,
  register,
  errors,
  control,
  setValue,
}: {
  field: FormField;
  register: ReturnType<typeof useForm>['register'];
  errors: Record<string, { message?: string } | undefined>;
  control: ReturnType<typeof useForm>['control'];
  setValue: ReturnType<typeof useForm>['setValue'];
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

      <FieldInput field={field} register={register} control={control} setValue={setValue} />

      {error?.message && (
        <p className="text-xs text-red-400 mt-1.5">{error.message}</p>
      )}
    </div>
  );
}

function FieldInput({
  field,
  register,
  control,
  setValue,
}: {
  field: FormField;
  register: ReturnType<typeof useForm>['register'];
  control: ReturnType<typeof useForm>['control'];
  setValue: ReturnType<typeof useForm>['setValue'];
}) {
  const cls = 'w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-colors';

  switch (field.type) {
    case 'short_text':
      return <input {...register(field.id)} placeholder={field.placeholder} className={cls} />;
    case 'long_text':
      return <textarea {...register(field.id)} placeholder={field.placeholder} rows={4} className={`${cls} resize-none`} />;
    case 'rich_text':
      return <textarea {...register(field.id)} placeholder="Markdown supported..." rows={6} className={`${cls} font-mono resize-none`} />;
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
        <Controller
          name={field.id}
          control={control}
          render={({ field: f }) => (
            <StarRating max={max} value={f.value ? Number(f.value) : undefined} onChange={(v) => f.onChange(v)} />
          )}
        />
      );
    }
    case 'image_upload':
      return (
        <WalrusUpload
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={5}
          label="image"
          value={undefined}
          onChange={(blobId) => setValue(field.id, blobId)}
        />
      );
    case 'video_upload':
      return (
        <WalrusUpload
          accept="video/mp4,video/webm"
          maxSizeMB={10}
          label="video"
          value={undefined}
          onChange={(blobId) => setValue(field.id, blobId)}
        />
      );
    case 'file_upload':
      return (
        <WalrusUpload
          maxSizeMB={10}
          label="file"
          value={undefined}
          onChange={(blobId) => setValue(field.id, blobId)}
        />
      );
    default:
      return <input {...register(field.id)} className={cls} />;
  }
}
