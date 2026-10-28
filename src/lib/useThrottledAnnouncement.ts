import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Fala `message` no leitor de tela quando ela muda, no máximo uma vez a cada `intervalMs`.
 * Se mudar de novo antes disso, fala a mais recente quando o intervalo acabar.
 */
export function useThrottledAnnouncement(message: string | null, intervalMs: number) {
  const lastAt = useRef(0);
  const lastMessage = useRef<string | null>(null);

  useEffect(() => {
    if (message === null || message === lastMessage.current) return;
    const wait = Math.max(0, lastAt.current + intervalMs - Date.now());
    const timer = setTimeout(() => {
      lastAt.current = Date.now();
      lastMessage.current = message;
      AccessibilityInfo.announceForAccessibility(message);
    }, wait);
    return () => clearTimeout(timer);
  }, [message, intervalMs]);
}
