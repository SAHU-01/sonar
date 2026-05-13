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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading form...</div>
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Form not found</h2>
          <p className="text-sm text-muted-foreground">{error ?? 'Unable to load this form.'}</p>
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
