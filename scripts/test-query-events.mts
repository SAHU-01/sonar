import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('devnet'), network: 'devnet' });
const PKG = '0xed8dbdc6ba2f8646485a0f3d3a6e55cd2d449c15aac22c67f225c21b40cd63e1';

const events = await client.queryEvents({
  query: { MoveEventType: `${PKG}::submission_batch::SubmissionRecorded` },
  order: 'descending',
});

console.log('Found', events.data.length, 'SubmissionRecorded events');
for (const e of events.data) {
  const p = e.parsedJson as Record<string, string>;
  console.log(`  blob_id: ${p.blob_id}, form_id: ${p.form_id}, submitter: ${p.submitter}`);
}
