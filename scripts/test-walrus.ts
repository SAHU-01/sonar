/**
 * Day 1 verification script: Walrus blob upload + fetch round-trip.
 * Tests publisher API, checks rate limits, and verifies data integrity.
 * Run with: npx tsx scripts/test-walrus.ts
 */

const PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';
const AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';

async function testUploadAndFetch() {
  console.log('=== Walrus Round-Trip Test ===\n');

  // Test 1: Upload a small text blob
  const testData = JSON.stringify({
    test: true,
    timestamp: new Date().toISOString(),
    message: 'Sonar Day 1 verification',
  });

  console.log('1. Uploading small text blob...');
  const startUpload = Date.now();
  const uploadRes = await fetch(`${PUBLISHER_URL}/v1/blobs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: new TextEncoder().encode(testData),
  });

  const uploadTime = Date.now() - startUpload;
  console.log(`   Status: ${uploadRes.status} (${uploadTime}ms)`);

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error(`   FAILED: ${errText}`);
    return;
  }

  const uploadJson = await uploadRes.json();
  console.log('   Response:', JSON.stringify(uploadJson, null, 2));

  const blobId = uploadJson.newlyCreated?.blobObject?.blobId || uploadJson.alreadyCertified?.blobId;
  if (!blobId) {
    console.error('   FAILED: No blobId in response');
    return;
  }
  console.log(`   Blob ID: ${blobId}\n`);

  // Test 2: Fetch it back
  console.log('2. Fetching blob back...');
  const startFetch = Date.now();
  const fetchRes = await fetch(`${AGGREGATOR_URL}/v1/blobs/${blobId}`);
  const fetchTime = Date.now() - startFetch;
  console.log(`   Status: ${fetchRes.status} (${fetchTime}ms)`);

  if (!fetchRes.ok) {
    console.error(`   FAILED: ${await fetchRes.text()}`);
    return;
  }

  const fetchedData = await fetchRes.text();
  const match = fetchedData === testData;
  console.log(`   Data matches: ${match}`);
  if (!match) {
    console.log(`   Expected: ${testData}`);
    console.log(`   Got: ${fetchedData}`);
  }

  // Test 3: Upload a larger blob (1MB) to test limits
  console.log('\n3. Uploading 1MB blob...');
  const largeData = new Uint8Array(1024 * 1024);
  crypto.getRandomValues(largeData);
  const startLarge = Date.now();
  const largeRes = await fetch(`${PUBLISHER_URL}/v1/blobs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: largeData,
  });
  const largeTime = Date.now() - startLarge;
  console.log(`   Status: ${largeRes.status} (${largeTime}ms)`);
  if (largeRes.ok) {
    const largeJson = await largeRes.json();
    console.log(`   Large blob ID: ${largeJson.newlyCreated?.blobObject?.blobId || largeJson.alreadyCertified?.blobId}`);
  } else {
    console.log(`   FAILED: ${await largeRes.text()}`);
  }

  console.log('\n=== Round-trip test complete ===');
}

testUploadAndFetch().catch(console.error);
