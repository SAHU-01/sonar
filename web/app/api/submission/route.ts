/**
 * POST /api/submission — server-side submission endpoint.
 * Accepts form data, uploads to Walrus, and optionally records on Sui
 * using the server-side wallet (for public forms where respondent has no wallet).
 */
import { NextResponse } from 'next/server';

const PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { formId, formVersion, data, encrypted } = body;

    if (!formId || !data) {
      return NextResponse.json({ error: 'Missing formId or data' }, { status: 400 });
    }

    const submission = {
      formId,
      formVersion: formVersion ?? 1,
      data,
      submittedAt: new Date().toISOString(),
      encrypted: encrypted ?? false,
    };

    // Upload to Walrus
    const uploadRes = await fetch(`${PUBLISHER_URL}/v1/blobs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: JSON.stringify(submission),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json({ error: `Walrus upload failed: ${errText}` }, { status: 502 });
    }

    const uploadJson = await uploadRes.json();
    const blobId = uploadJson.newlyCreated?.blobObject?.blobId || uploadJson.alreadyCertified?.blobId;

    if (!blobId) {
      return NextResponse.json({ error: 'No blobId in Walrus response' }, { status: 502 });
    }

    return NextResponse.json({ blobId, formId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
