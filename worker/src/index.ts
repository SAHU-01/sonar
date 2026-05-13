/**
 * Worker entry point. Runs the batcher (every 10 min) and Sui event indexer.
 * Deployed on Render/Railway as a long-running process.
 */
import { startBatcher } from './batcher.js';
import { startIndexer } from './indexer.js';

async function main() {
  console.log('[worker] Starting Sonar worker...');
  startBatcher();
  startIndexer();
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
