/**
 * Batcher: every 10 minutes, pulls queued submissions from Postgres,
 * builds a Merkle tree, uploads the batch blob to Walrus, and commits
 * the Merkle root to Sui via a PTB.
 */

const BATCH_INTERVAL_MS = 10 * 60 * 1000;

export function startBatcher() {
  console.log('[batcher] Started — batching every 10 minutes');
  setInterval(async () => {
    try {
      await runBatch();
    } catch (err) {
      console.error('[batcher] Error:', err);
    }
  }, BATCH_INTERVAL_MS);
}

async function runBatch() {
  // TODO: implement
  // 1. Query pending submissions from Postgres
  // 2. Build Merkle tree from submission hashes
  // 3. Upload batch blob to Walrus
  // 4. Commit Merkle root + blob ID to Sui via PTB
  // 5. Update submissions in Postgres with batch ID
  console.log('[batcher] Tick — checking for pending submissions...');
}
