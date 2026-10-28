import { router } from 'expo-router';

import { getBaseline } from '@/db/guideRepo';
import { getRecording } from '@/db/recordingsRepo';

/**
 * "Ouvir antes × depois" na regravação mensal (seção 9.4): a leitura da gravação inicial
 * (a gravação mais longa do início) contra a leitura de hoje.
 */
export async function openBeforeAfter(readingRecordingId: string): Promise<boolean> {
  const baseline = await getBaseline('first');
  if (!baseline) return false;
  const recordings = (await Promise.all(baseline.recordingIds.map(getRecording))).flatMap((r) => (r ? [r] : []));
  const reading = recordings.reduce<(typeof recordings)[number] | null>((best, r) => (!best || r.durationSec > best.durationSec ? r : best), null);
  if (!reading) return false;
  router.push({ pathname: '/recordings/compare', params: { a: reading.id, b: readingRecordingId } });
  return true;
}
