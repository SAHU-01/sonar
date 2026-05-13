/**
 * Sui client utilities and PTB builders for Sonar.
 * Uses @mysten/sui v2 for transaction construction and submission.
 */
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';

const network = (process.env.SUI_NETWORK || process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet') as 'devnet' | 'testnet' | 'mainnet';
const PACKAGE_ID = process.env.SUI_PACKAGE_ID || process.env.NEXT_PUBLIC_PACKAGE_ID || '';

export const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });

export function buildCreateFormTx(title: string, blobId: string, encrypted: boolean): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::form_registry::create_form`,
    arguments: [
      tx.pure.string(title),
      tx.pure.string(blobId),
      tx.pure.bool(encrypted),
    ],
  });
  return tx;
}

export function buildUpdateFormTx(formObjectId: string, newBlobId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::form_registry::update_form`,
    arguments: [
      tx.object(formObjectId),
      tx.pure.string(newBlobId),
    ],
  });
  return tx;
}

export function buildRecordSubmissionTx(
  formId: string,
  blobId: string,
  encrypted: boolean,
  formVersion: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission_batch::record_submission`,
    arguments: [
      tx.pure.address(formId),
      tx.pure.string(blobId),
      tx.pure.bool(encrypted),
      tx.pure.u64(formVersion),
    ],
  });
  return tx;
}

export function buildCommitBatchTx(
  registryObjectId: string,
  merkleRoot: string,
  blobId: string,
  submissionCount: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission_batch::commit_batch`,
    arguments: [
      tx.object(registryObjectId),
      tx.pure.string(merkleRoot),
      tx.pure.string(blobId),
      tx.pure.u64(submissionCount),
    ],
  });
  return tx;
}

export function buildCreateRegistryTx(formId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission_batch::create_registry`,
    arguments: [
      tx.pure.address(formId),
    ],
  });
  return tx;
}

export { PACKAGE_ID, network };
