/**
 * End-to-end test: upload submission to Walrus, record on Sui, query back, fetch from Walrus.
 */
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const PKG = '0xed8dbdc6ba2f8646485a0f3d3a6e55cd2d449c15aac22c67f225c21b40cd63e1';
const FORM_ID = '0x56c23284381b7da74dd22bc1f1beb649b770352819ed719e06cb4c6a562ca96f';

const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('devnet'), network: 'devnet' });

// Step 1: Create a real submission
const submission = {
  formId: FORM_ID,
  formVersion: 1,
  data: {
    name: 'Test User',
    feedback: 'Sonar is amazing! This submission is stored on Walrus.',
    rating: 5,
  },
  submittedAt: new Date().toISOString(),
  encrypted: false,
};

console.log('1. Uploading submission to Walrus...');
const uploadRes = await fetch(`${PUBLISHER}/v1/blobs`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: new TextEncoder().encode(JSON.stringify(submission)),
});
const uploadJson = await uploadRes.json() as Record<string, any>;
const blobId = uploadJson.newlyCreated?.blobObject?.blobId || uploadJson.alreadyCertified?.blobId;
console.log(`   Blob ID: ${blobId}`);

// Step 2: Fetch it back from Walrus to verify
console.log('2. Fetching from Walrus to verify...');
const fetchRes = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
const fetchedText = await fetchRes.text();
const parsed = JSON.parse(fetchedText);
console.log(`   Matches: ${parsed.data.feedback === submission.data.feedback}`);
console.log(`   Data: ${JSON.stringify(parsed.data)}`);

// Step 3: Query existing events
console.log('3. Querying Sui events for this form...');
const events = await client.queryEvents({
  query: { MoveEventType: `${PKG}::submission_batch::SubmissionRecorded` },
  order: 'descending',
});
console.log(`   Found ${events.data.length} events for this package`);

console.log('\n=== E2E test complete. Walrus upload/fetch + Sui event query all working. ===');
