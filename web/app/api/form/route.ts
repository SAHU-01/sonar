/**
 * GET /api/form?id=<objectId> — fetches form schema from Sui + Walrus.
 * Useful for programmatic access to form definitions.
 */
import { NextResponse } from 'next/server';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
const network = (process.env.SUI_NETWORK || 'devnet') as 'devnet' | 'testnet' | 'mainnet';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });
    const obj = await client.getObject({ id, options: { showContent: true } });
    const content = obj.data?.content;

    if (!content || content.dataType !== 'moveObject') {
      return NextResponse.json({ error: 'Not a valid form object' }, { status: 404 });
    }

    const fields = content.fields as Record<string, string>;
    const blobId = fields.current_blob_id;

    if (!blobId) {
      return NextResponse.json({ error: 'Form has no schema blob' }, { status: 404 });
    }

    const blobRes = await fetch(`${AGGREGATOR_URL}/v1/blobs/${blobId}`);
    if (!blobRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch schema from Walrus' }, { status: 502 });
    }

    const schema = await blobRes.json();
    return NextResponse.json({ schema, blobId, objectId: id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
