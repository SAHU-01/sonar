/**
 * Indexer: polls Sui events for FormRegistry and SubmissionBatch events.
 * Updates local Postgres state to stay in sync with on-chain data.
 * Uses @mysten/sui event subscription — no custom indexer framework.
 */

const POLL_INTERVAL_MS = 15_000;

export function startIndexer() {
  console.log('[indexer] Started — polling every 15 seconds');
  setInterval(async () => {
    try {
      await pollEvents();
    } catch (err) {
      console.error('[indexer] Error:', err);
    }
  }, POLL_INTERVAL_MS);
}

async function pollEvents() {
  // TODO: implement
  // 1. Query Sui events since last cursor
  // 2. Process FormCreated, FormUpdated, BatchCommitted events
  // 3. Update Postgres accordingly
  // 4. Save cursor for next poll
}
