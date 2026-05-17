/**
 * Form renderer page. Fetches the form schema from Walrus via the Sui object,
 * renders it with react-hook-form + Zod, and submits responses to Walrus + Sui.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FormRenderer } from '@/components/renderer/FormRenderer';
import { suiClient } from '@/lib/sui';
import { fetchBlobAsText } from '@/lib/walrus';
import type { FormSchemaType } from '@sonar/shared/schema';

export default function FormPage() {
  const { formId } = useParams<{ formId: string }>();
  const searchParams = useSearchParams();
  const embed = searchParams.get('embed') === 'true';
  const [schema, setSchema] = useState<FormSchemaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) return;
    loadForm(formId).then(setSchema).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [formId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
        <div className="text-xl font-black lowercase opacity-30">loading form...</div>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
        <div className="neo-card bg-card p-12 text-center max-w-md shadow-brutal-lg">
          <div className="w-20 h-20 rounded-2xl bg-destructive border-2 border-border-strong flex items-center justify-center mx-auto mb-8 shadow-brutal-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
          <h2 className="text-4xl mb-4">form not found</h2>
          <p className="text-lg font-bold opacity-60 lowercase leading-tight">{error ?? 'unable to load this form.'}</p>
          <a href="/" className="neo-btn bg-accent mt-10 inline-block px-8 py-3 text-sm">back home</a>
        </div>
      </div>
    );
  }

  return <FormRenderer schema={schema} formObjectId={formId} embed={embed} />;
}

async function loadForm(formObjectId: string): Promise<FormSchemaType> {
  const obj = await suiClient.getObject({
    id: formObjectId,
    options: { showContent: true },
  });

  const content = obj.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    throw new Error('Not a valid form object');
  }

  const fields = content.fields as Record<string, unknown>;
  const blobId = fields.current_blob_id as string;
  if (!blobId) throw new Error('Form has no schema blob');

  const schemaText = await fetchBlobAsText(blobId);
  return JSON.parse(schemaText) as FormSchemaType;
}
