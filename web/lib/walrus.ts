/**
 * Walrus HTTP API client for blob upload (publisher) and fetch (aggregator).
 * Uses testnet endpoints. Handles both server-side and client-side uploads.
 */

const PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL || process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
const AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

export async function uploadBlob(data: Uint8Array | string): Promise<string> {
  const body = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  const res = await fetch(`${PUBLISHER_URL}/v1/blobs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Walrus upload failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  // Response shape: { newlyCreated: { blobObject: { blobId: "..." } } }
  // or { alreadyCertified: { blobId: "..." } }
  const blobId = json.newlyCreated?.blobObject?.blobId || json.alreadyCertified?.blobId;
  if (!blobId) {
    throw new Error(`Unexpected Walrus response: ${JSON.stringify(json)}`);
  }
  return blobId;
}

export async function fetchBlob(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${AGGREGATOR_URL}/v1/blobs/${blobId}`);
  if (!res.ok) {
    throw new Error(`Walrus fetch failed (${res.status}): ${await res.text()}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function fetchBlobAsText(blobId: string): Promise<string> {
  const bytes = await fetchBlob(blobId);
  return new TextDecoder().decode(bytes);
}

export { PUBLISHER_URL, AGGREGATOR_URL };
