/**
 * Seal encryption/decryption wrapper. Uses @mysten/seal for client-side
 * encryption of form submissions. The `id` parameter for encrypt is constructed
 * as hex(policyObjectId bytes + 5 random nonce bytes).
 */
import { SealClient, SessionKey, EncryptedObject } from '@mysten/seal';
import type { SealCompatibleClient } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex, toHex } from '@mysten/sui/utils';

export interface SealConfig {
  suiClient: SealCompatibleClient;
  packageId: string;
  policyModule: string;
  keyServerObjectIds: string[];
  threshold: number;
}

let _sealClient: SealClient | null = null;

export function getSealClient(config: SealConfig): SealClient {
  if (!_sealClient) {
    _sealClient = new SealClient({
      suiClient: config.suiClient,
      serverConfigs: config.keyServerObjectIds.map((objectId) => ({
        objectId,
        weight: 1,
      })),
      verifyKeyServers: false, // testnet
    });
  }
  return _sealClient;
}

export function constructSealId(policyObjectId: string): string {
  const nonce = crypto.getRandomValues(new Uint8Array(5));
  const policyBytes = fromHex(policyObjectId);
  return toHex(new Uint8Array([...policyBytes, ...nonce]));
}

export async function encryptSubmission(
  data: Uint8Array,
  formObjectId: string,
  config: SealConfig,
): Promise<{ encryptedData: Uint8Array; sealId: string }> {
  const client = getSealClient(config);
  const sealId = constructSealId(formObjectId);

  const { encryptedObject } = await client.encrypt({
    threshold: config.threshold,
    packageId: config.packageId,
    id: sealId,
    data,
  });

  return { encryptedData: encryptedObject, sealId };
}

export async function decryptSubmission(
  encryptedData: Uint8Array,
  config: SealConfig,
  sessionKey: SessionKey,
  buildMoveCall: (tx: Transaction, id: string) => void,
): Promise<Uint8Array> {
  const client = getSealClient(config);

  const parsed = EncryptedObject.parse(encryptedData);
  const id = parsed.id;

  const tx = new Transaction();
  buildMoveCall(tx, id);
  const txBytes = await tx.build({ client: config.suiClient, onlyTransactionKind: true });

  await client.fetchKeys({
    ids: [id],
    txBytes,
    sessionKey,
    threshold: config.threshold,
  });

  return client.decrypt({
    data: encryptedData,
    sessionKey,
    txBytes,
  });
}

export { SessionKey, EncryptedObject };
