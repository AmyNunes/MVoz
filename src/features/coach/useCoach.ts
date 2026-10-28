import { useState } from 'react';

import { toAIError, type AIError } from '@/ai/client';
import { coachTurn } from '@/ai/functions/coach';
import { endConversation, getOpenConversation, saveConversation, type CoachMessage } from '@/db/coachRepo';
import { nowIso } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';

import { loadUserContext } from '../ai/userContext';

type Conversation = { id: string | null; messages: CoachMessage[] };

/** Perguntar à IA (Coach, seção 10.9): a conversa em aberto fica salva no aparelho. */
export function useCoach() {
  const loader = useLoader(getOpenConversation);
  const [local, setLocal] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<AIError | null>(null);
  const loaded = loader.state.status === 'success' ? { id: loader.state.data?.id ?? null, messages: loader.state.data?.messages ?? [] } : null;
  const conversation = local ?? loaded;

  /** Pede a resposta para a conversa como está (a última mensagem é minha). */
  const ask = async (current: Conversation) => {
    setSending(true);
    setError(null);
    try {
      const id = await saveConversation(current.id, current.messages);
      setLocal({ id, messages: current.messages });
      const history = current.messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await coachTurn(history, await loadUserContext());
      const answer: CoachMessage = { role: 'assistant', content: reply.replyPt, at: nowIso(), exerciseIds: reply.suggestedExerciseIds, safetyFlag: reply.safetyFlag };
      const messages = [...current.messages, answer];
      await saveConversation(id, messages);
      setLocal({ id, messages });
    } catch (e) {
      setError(toAIError(e));
    } finally {
      setSending(false);
    }
  };

  const send = (text: string = draft) => {
    const content = text.trim();
    if (!conversation || !content || sending) return;
    const mine: CoachMessage = { role: 'user', content, at: nowIso(), exerciseIds: [], safetyFlag: false };
    const next = { id: conversation.id, messages: [...conversation.messages, mine] };
    setLocal(next);
    setDraft('');
    void ask(next);
  };

  const retry = () => {
    if (conversation && conversation.messages.at(-1)?.role === 'user') void ask(conversation);
  };

  const newChat = async () => {
    if (conversation?.id) await endConversation(conversation.id).catch(() => {});
    setLocal({ id: null, messages: [] });
    setError(null);
  };

  return { state: loader.state, reload: loader.reload, messages: conversation?.messages ?? [], draft, setDraft, sending, error, send, retry, newChat };
}
