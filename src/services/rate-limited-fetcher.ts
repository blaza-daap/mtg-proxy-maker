import { fetchCard, fetchDoubleFacedCard } from "./scryfall";
import type { Card } from "../types/card";

export type ProgressCallback = (current: number, total: number) => void;

export type FetchResult = {
  cards: Card[];
  skippedCards: string[];
};

const BATCH_SIZE = 9;
const BATCH_DELAY_MS = 12000; // 12 seconds between batches

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchCardsWithRateLimit(
  cardNames: string[],
  language: string,
  onProgress?: ProgressCallback
): Promise<FetchResult> {
  const results: Card[] = [];
  const skipped: string[] = [];
  const total = cardNames.length;

  for (let i = 0; i < cardNames.length; i += BATCH_SIZE) {
    const batch = cardNames.slice(i, Math.min(i + BATCH_SIZE, cardNames.length));
    
    // Fetch batch in parallel with error handling
    const batchResults = await Promise.allSettled(
      batch.map(name => fetchCard(name, language, 0))
    );
    
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Card failed to fetch, add to skipped list
        skipped.push(batch[idx]);
        console.warn(`Skipped card: ${batch[idx]}`, result.reason);
      }
    });
    
    // Update progress (count both successes and failures)
    if (onProgress) {
      onProgress(results.length + skipped.length, total);
    }
    
    // Wait before next batch (unless this is the last batch)
    if (i + BATCH_SIZE < cardNames.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { cards: results, skippedCards: skipped };
}

/**
 * Fetches double-faced cards with rate limiting.
 * Each card will have its back face set as the verso.
 */
export async function fetchDoubleFacedCardsWithRateLimit(
  cardNames: string[],
  language: string,
  onProgress?: ProgressCallback
): Promise<FetchResult> {
  const results: Card[] = [];
  const skipped: string[] = [];
  const total = cardNames.length;

  for (let i = 0; i < cardNames.length; i += BATCH_SIZE) {
    const batch = cardNames.slice(i, Math.min(i + BATCH_SIZE, cardNames.length));
    
    // Fetch batch in parallel with error handling
    const batchResults = await Promise.allSettled(
      batch.map(name => fetchDoubleFacedCard(name, language))
    );
    
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Card failed to fetch, add to skipped list
        skipped.push(batch[idx]);
        console.warn(`Skipped double-faced card: ${batch[idx]}`, result.reason);
      }
    });
    
    // Update progress (count both successes and failures)
    if (onProgress) {
      onProgress(results.length + skipped.length, total);
    }
    
    // Wait before next batch (unless this is the last batch)
    if (i + BATCH_SIZE < cardNames.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { cards: results, skippedCards: skipped };
}
