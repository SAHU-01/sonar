/**
 * Seal encryption/decryption wrapper. Uses @mysten/seal for client-side
 * encryption of form submissions. Handles ID construction, encrypt, and decrypt flows.
 */

// TODO: implement after Day 1 verification of Seal SDK patterns
// This is a placeholder that will be filled in once we verify:
// 1. The exact SealClient API surface
// 2. BCS encoding requirements for the `id` parameter
// 3. Session key signing flow
// 4. Key server allowlisting requirements

export interface SealConfig {
  packageId: string;
  policyModule: string;
  keyServerIds: string[];
  threshold: number;
}

export async function encryptSubmission(
  _data: Uint8Array,
  _formObjectId: string,
  _config: SealConfig,
): Promise<Uint8Array> {
  // TODO: implement with SealClient.encrypt()
  throw new Error('Seal encryption not yet implemented — pending Day 1 verification');
}

export async function decryptSubmission(
  _encryptedData: Uint8Array,
  _formObjectId: string,
  _config: SealConfig,
): Promise<Uint8Array> {
  // TODO: implement with SealClient.decrypt()
  throw new Error('Seal decryption not yet implemented — pending Day 1 verification');
}
