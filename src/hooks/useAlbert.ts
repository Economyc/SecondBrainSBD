import { useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import type { Conversation, ChatMessage } from '@/types';

const COLLECTION = 'albert_conversations';

export function useAlbert() {
  const { environment } = useEnvironment();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setActiveConversationId(null);
    const unsub = onSnapshot(getCol(environment, COLLECTION), (snapshot) => {
      const convs = snapshot.docs
        .map(d => d.data() as Conversation)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(convs);
      setLoading(false);
    });
    return unsub;
  }, [environment]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const createConversation = useCallback(async () => {
    const conv: Conversation = {
      id: uuid(),
      title: 'Nueva conversación',
      messages: [],
      model: localStorage.getItem('albert:preferred_model') || 'llama-3.3-70b-versatile',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(getDocRef(environment, COLLECTION, conv.id), conv);
    setActiveConversationId(conv.id);
    return conv;
  }, [environment]);

  const deleteConversation = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, COLLECTION, id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [environment, activeConversationId]);

  const addMessage = useCallback(async (convId: string, message: ChatMessage) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const updatedMessages = [...conv.messages, message];
    await updateDoc(getDocRef(environment, COLLECTION, convId), {
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    });
  }, [environment, conversations]);

  const updateConversation = useCallback(async (id: string, updates: Partial<Conversation>) => {
    await updateDoc(getDocRef(environment, COLLECTION, id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }, [environment]);

  return {
    conversations,
    loading,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    addMessage,
    updateConversation,
  };
}
