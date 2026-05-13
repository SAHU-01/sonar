/**
 * Submission utilities for Walrus-only storage.
 * Submissions are uploaded directly to Walrus as blobs, with the blob ID
 * recorded on Sui via the FormRegistry or a submission event.
 * No database — everything lives on Walrus + Sui.
 */
import { uploadBlob, fetchBlobAsText } from './walrus';
import { suiClient } from './sui';

export interface SubmissionRecord {
  formId: string;
  formVersion: number;
  data: Record<string, unknown>;
  submittedAt: string;
  submitterWallet?: string;
  encrypted: boolean;
  blobId?: string;
}

export async function submitToWalrus(submission: SubmissionRecord): Promise<string> {
  const json = JSON.stringify(submission);
  const blobId = await uploadBlob(json);
  return blobId;
}

export async function fetchSubmission(blobId: string): Promise<SubmissionRecord> {
  const text = await fetchBlobAsText(blobId);
  return JSON.parse(text) as SubmissionRecord;
}

export async function fetchSubmissionsForForm(formObjectId: string, packageId: string): Promise<Array<{ blobId: string; digest: string; timestamp: string }>> {
  const events = await suiClient.queryEvents({
    query: {
      MoveEventType: `${packageId}::submission_batch::SubmissionRecorded`,
    },
    order: 'descending',
  });

  return events.data
    .filter((e) => {
      const parsed = e.parsedJson as Record<string, unknown>;
      return parsed?.form_id === formObjectId;
    })
    .map((e) => {
      const parsed = e.parsedJson as Record<string, unknown>;
      return {
        blobId: parsed.blob_id as string,
        digest: e.id.txDigest,
        timestamp: e.timestampMs ?? '',
      };
    });
}
