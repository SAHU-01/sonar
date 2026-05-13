/**
 * Edit form page. Loads existing form schema from Sui+Walrus,
 * opens it in the builder for editing, and publishes a new version.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FormBuilder } from '@/components/builder/FormBuilder';
import { suiClient } from '@/lib/sui';
import { fetchBlobAsText } from '@/lib/walrus';
import type { FormSchemaType } from '@sonar/shared/schema';

export default function EditFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [schema, setSchema] = useState<FormSchemaType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formId) return;
    (async () => {
      try {
        const obj = await suiClient.getObject({ id: formId, options: { showContent: true } });
        const content = obj.data?.content;
        if (content?.dataType === 'moveObject') {
          const fields = content.fields as Record<string, string>;
          const blobId = fields.current_blob_id;
          if (blobId) {
            const text = await fetchBlobAsText(blobId);
            setSchema(JSON.parse(text));
          }
        }
      } catch (err) {
        console.error('Failed to load form:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [formId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  return <FormBuilder existingFormId={formId} existingSchema={schema ?? undefined} />;
}
