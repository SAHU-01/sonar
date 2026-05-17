/**
 * FormRenderer: renders a form schema fetched from Walrus. Uses react-hook-form
 * with Zod resolver for validation. Submits responses to Walrus and records on Sui.
 * Supports conditional fields, file uploads to Walrus, interactive star rating.
 */
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildFormSchema } from '@/lib/zod-builder';
import { uploadBlob } from '@/lib/walrus';
import { buildRecordSubmissionTx, PACKAGE_ID, suiClient, network } from '@/lib/sui';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectButton } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { WalrusUpload } from './fields/WalrusUpload';
import { StarRating } from './fields/StarRating';
import { fetchBlobAsText } from '@/lib/walrus';
import type { FormSchemaType, FormField } from '@sonar/shared/schema';

interface FormRendererProps {
  schema: FormSchemaType;
  formObjectId: string;
  embed?: boolean;
}

export function FormRenderer({ schema, formObjectId, embed }: FormRendererProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [lastSubmissionBlobId, setLastSubmissionBlobId] = useState<string | null>(null);
  const [isEditingPrevious, setIsEditingPrevious] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const zodSchema = buildFormSchema(schema.fields);
  const { register, handleSubmit, formState: { errors }, watch, control, reset } = useForm({
    resolver: zodResolver(zodSchema),
  });

  // Check if this wallet has already submitted
  useEffect(() => {
    if (!account) {
      setCheckingStatus(false);
      return;
    }
    
    suiClient.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::submission_batch::SubmissionRecorded` },
    }).then(result => {
      const myEvents = result.data.filter(e => {
        const p = e.parsedJson as any;
        return p.form_id === formObjectId && p.submitter === account.address;
      });
      
      if (myEvents.length > 0) {
        setHasAlreadySubmitted(true);
        // Get the latest one
        const latest = myEvents[0];
        setLastSubmissionBlobId((latest.parsedJson as any).blob_id);
      }
    }).finally(() => setCheckingStatus(false));
  }, [account, formObjectId]);

  const loadPreviousResponse = async () => {
    if (!lastSubmissionBlobId) return;
    setCheckingStatus(true);
    try {
      const text = await fetchBlobAsText(lastSubmissionBlobId);
      const parsed = JSON.parse(text);
      reset(parsed.data ?? parsed);
      setIsEditingPrevious(true);
      setHasAlreadySubmitted(false);
    } catch (err) {
      toast.error('failed to load previous response');
    } finally {
      setCheckingStatus(false);
    }
  };

  const watchedValues = watch();
  const needsWallet = schema.accessControl?.type !== 'public';

  const isEncryptedConfig = schema.encryption?.enabled ?? false;

  const onSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    let finalIsEncrypted = false;
    try {
      const jsonBytes = new TextEncoder().encode(JSON.stringify({
        formId: formObjectId,
        formVersion: schema.version,
        data,
        submittedAt: new Date().toISOString(),
        submitterWallet: account?.address,
        encrypted: isEncryptedConfig, // This is what the schema requested
      }));
      
      let uploadBytes: Uint8Array | string = jsonBytes;

      if (isEncryptedConfig) {
        if (network === 'devnet') {
          toast.warning('Seal encryption infrastructure is not available on Sui Devnet. Submitting response in plaintext for the demo.');
        } else {
          toast.info('Encrypting response with Seal...');
          try {
            const { encryptSubmission } = await import('@/lib/seal');
            const keyServersEnv = process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_IDS || '';
            const defaultKeyServers = [
              '0x4d5d36e2f1f6c449c258d4157d6928e08d6c827c1968832a8396c0032f38d388',
              '0x170b0210214a1e95e8657688225e369062327429654d2417d472c695b77cf354',
              '0x8797f1f0e4a779ca5483a936a282f14436573c79c855e9259253457007e0c4a0'
            ];
            const config = {
              suiClient,
              packageId: schema.encryption!.policyPackageId!,
              policyModule: schema.encryption!.policyModule!,
              keyServerObjectIds: keyServersEnv ? keyServersEnv.split(',').filter(Boolean) : defaultKeyServers,
              threshold: Number(process.env.NEXT_PUBLIC_SEAL_THRESHOLD ?? 2),
            };
            const { encryptedData } = await encryptSubmission(jsonBytes, formObjectId, config);
            uploadBytes = encryptedData;
            finalIsEncrypted = true;
            toast.success('Encrypted!');
          } catch (encErr) {
            console.error('Encryption failed:', encErr);
            toast.warning('Seal encryption failed (likely missing objects on this network). Submitting in plaintext.');
          }
        }
      }

      toast.info('Uploading to Walrus...');
      const blobId = await uploadBlob(uploadBytes);

      if (account && PACKAGE_ID) {
        toast.info('Recording on Sui...');
        const tx = buildRecordSubmissionTx(formObjectId, blobId, finalIsEncrypted, schema.version);
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

  if (submitted || (hasAlreadySubmitted && schema.submissionLimit === 'per_wallet' && !isEditingPrevious)) {
    return (
      <div className={`${embed ? 'py-12' : 'min-h-screen py-20'} flex items-center justify-center px-6`} style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
        <div className="neo-card bg-card p-12 text-center max-w-md shadow-brutal-lg">
          <div className="w-20 h-20 rounded-2xl bg-cta text-cta-foreground border-2 border-border-strong flex items-center justify-center mx-auto mb-8 shadow-brutal-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h2 className="text-4xl mb-4">{hasAlreadySubmitted ? 'already responded' : 'thank you!'}</h2>
          <p className="text-lg font-bold opacity-60 lowercase leading-tight mb-10">
            {hasAlreadySubmitted 
              ? 'you have already submitted a response for this form.'
              : (schema.successMessage ?? 'your response has been submitted.')}
          </p>
          
          <div className="flex flex-col gap-4">
            {hasAlreadySubmitted && schema.allowEditing && (
              <button 
                onClick={loadPreviousResponse}
                className="neo-btn bg-accent py-4 text-sm font-black lowercase shadow-brutal-sm"
              >
                edit your response
              </button>
            )}
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href.split('?')[0]);
                toast.success('link copied!');
              }}
              className="neo-btn bg-cta text-cta-foreground py-4 text-sm font-black lowercase shadow-brutal-sm"
            >
              share form link
            </button>
            <a href="/" className="neo-btn bg-card py-4 text-sm font-black lowercase shadow-brutal-sm">back home</a>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className={`${embed ? 'py-12' : 'min-h-screen py-20'} flex items-center justify-center px-6`} style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
        <div className="neo-card bg-card p-12 text-center max-w-md shadow-brutal-lg">
          <div className="w-20 h-20 rounded-2xl bg-accent border-2 border-border-strong flex items-center justify-center mx-auto mb-8 shadow-brutal-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 className="text-4xl mb-4">wallet required</h2>
          <p className="text-lg font-bold opacity-60 lowercase leading-tight mb-10">
            this form requires a connected sui wallet to verify your identity and prevent spam.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (checkingStatus) {
    return (
      <div className={`${embed ? 'py-12' : 'min-h-screen py-20'} flex items-center justify-center bg-background`} style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
        <div className="text-xl font-black lowercase opacity-20 animate-pulse">checking submission status...</div>
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
    <div className={`${embed ? 'py-8' : 'min-h-screen py-20'} flex justify-center px-6 selection:bg-cta selection:text-cta-foreground`} style={{ background: embed ? 'transparent' : 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-24 h-24 border-8 border-border-strong border-t-cta rounded-full animate-spin mb-8 shadow-brutal-sm" />
          <h2 className="text-4xl mb-4 font-black lowercase">submitting...</h2>
          <p className="text-lg font-bold opacity-60 lowercase max-w-sm">
            uploading to walrus and recording on the sui blockchain. do not close this window.
          </p>
        </div>
      )}

      <div className="w-full max-w-2xl">
        <div className="neo-card bg-card p-10 sm:p-14 shadow-brutal-lg mb-12">
          {/* Header */}
          {!embed && (
            <div className="mb-12 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="min-w-0">
                <h1 className="text-4xl sm:text-5xl mb-4 leading-tight truncate">{schema.title || 'untitled form'}</h1>
                {schema.description && <p className="text-lg font-bold opacity-60 lowercase leading-tight">{schema.description}</p>}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href.split('?')[0]);
                  toast.success('link copied!');
                }}
                className="neo-btn-cta text-cta-foreground px-6 py-2.5 text-xs flex items-center gap-2 shadow-brutal-sm self-start"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                share
              </button>
            </div>
          )}

          {/* Encryption data policy notice */}
          {isEncryptedConfig && (
            <div className="neo-card bg-info p-8 mb-10 border-border-strong shadow-brutal">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-card border-2 border-border-strong flex items-center justify-center shrink-0 shadow-brutal-sm">
                  <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl mb-2 text-info-foreground font-black lowercase">your response is encrypted</h2>
                  <p className="text-sm font-bold text-info-foreground/70 leading-tight lowercase">
                    this form uses end-to-end encryption via seal. your data is encrypted in your browser
                    before being stored on walrus. only the form owner can decrypt your response.
                  </p>
                </div>
              </div>
            </div>
          )}

          {needsWallet && !account && (
            <div className="neo-card bg-accent p-8 mb-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-lg font-black lowercase">this form requires a wallet</p>
              <ConnectButton />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {visibleFields.map((field) => (
              <RenderField
                key={field.id}
                field={field}
                register={register}
                errors={errors}
                control={control}
              />
            ))}

            <button
              type="submit"
              disabled={isSubmitting || (needsWallet && !account)}
              className="w-full neo-btn-cta text-cta-foreground py-5 text-xl disabled:opacity-50"
              style={schema.branding?.accentColor ? { backgroundColor: schema.branding.accentColor } : undefined}
            >
              {isSubmitting ? 'submitting...' : 'submit'} &rarr;
            </button>
          </form>

          {!embed && (
            <p className="text-center text-xs font-black uppercase tracking-widest opacity-20 mt-16">
              powered by <a href="/" className="text-foreground underline">sonar</a> — stored on walrus
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RenderField({
  field,
  register,
  errors,
  control,
}: {
  field: FormField;
  register: ReturnType<typeof useForm>['register'];
  errors: Record<string, { message?: string } | undefined>;
  control: ReturnType<typeof useForm>['control'];
}) {
  const error = errors[field.id];

  if (field.type === 'section_header') {
    return (
      <div className="pt-10 border-t-4 border-border-strong/5">
        <h3 className="text-3xl mb-2">{field.label}</h3>
        {field.helpText && <p className="text-sm font-bold opacity-50 lowercase">{field.helpText}</p>}
      </div>
    );
  }

  if (field.type === 'description_block') {
    return <p className="text-lg font-bold opacity-60 lowercase leading-tight">{field.label}</p>;
  }

  return (
    <div className="space-y-4">
      <label className="block text-lg font-black lowercase tracking-tight">
        {field.label}
        {field.required && <span className="text-destructive ml-2 font-black text-2xl leading-none">*</span>}
      </label>
      {field.helpText && <p className="text-sm font-bold opacity-50 lowercase leading-tight">{field.helpText}</p>}

      <FieldInput field={field} register={register} control={control} />

      {error?.message && (
        <p className="text-sm font-bold text-destructive lowercase mt-2 ml-1">{error.message}</p>
      )}
    </div>
  );
}

function FieldInput({
  field,
  register,
  control,
}: {
  field: FormField;
  register: ReturnType<typeof useForm>['register'];
  control: ReturnType<typeof useForm>['control'];
}) {
  const cls = 'w-full neo-input font-bold text-lg lowercase placeholder:opacity-20';

  switch (field.type) {
    case 'short_text':
      return <input {...register(field.id)} placeholder={field.placeholder} className={cls} />;
    case 'long_text':
      return <textarea {...register(field.id)} placeholder={field.placeholder} rows={4} className={`${cls} resize-none`} />;
    case 'rich_text':
      return <textarea {...register(field.id)} placeholder="markdown supported..." rows={6} className={`${cls} font-mono resize-none`} />;
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
          <option value="">select...</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-4">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-4 cursor-pointer group">
              <input type="radio" {...register(field.id)} value={o} className="w-6 h-6 accent-cta border-2 border-border-strong rounded-full shadow-brutal-sm" />
              <span className="text-lg font-bold lowercase">{o}</span>
            </label>
          ))}
        </div>
      );
    case 'checkboxes':
    case 'multi_select':
      return (
        <div className="space-y-4">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-4 cursor-pointer group">
              <input type="checkbox" {...register(field.id)} value={o} className="w-6 h-6 accent-cta border-2 border-border-strong rounded-lg shadow-brutal-sm" />
              <span className="text-lg font-bold lowercase">{o}</span>
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
    case 'image_upload': {
      const imgFormats = (field.config?.acceptedFormats as string[]) ?? ['JPEG', 'PNG', 'WebP'];
      const imgAccept = imgFormats.map(f => `image/${f.toLowerCase()}`).join(',');
      return (
        <Controller name={field.id} control={control}
          render={({ field: f }) => (
            <WalrusUpload accept={imgAccept} maxSizeMB={(field.config?.maxSizeMB as number) ?? 5} label="image" value={f.value} onChange={f.onChange} />
          )}
        />
      );
    }
    case 'video_upload': {
      const vidFormats = (field.config?.acceptedFormats as string[]) ?? ['MP4', 'WebM'];
      const vidAccept = vidFormats.map(f => `video/${f.toLowerCase()}`).join(',');
      return (
        <Controller name={field.id} control={control}
          render={({ field: f }) => (
            <WalrusUpload accept={vidAccept} maxSizeMB={(field.config?.maxSizeMB as number) ?? 10} label="video" value={f.value} onChange={f.onChange} />
          )}
        />
      );
    }
    case 'file_upload':
      return (
        <Controller name={field.id} control={control}
          render={({ field: f }) => (
            <WalrusUpload maxSizeMB={(field.config?.maxSizeMB as number) ?? 10} label="file" value={f.value} onChange={f.onChange} />
          )}
        />
      );
    default:
      return <input {...register(field.id)} className={cls} />;
  }
}
