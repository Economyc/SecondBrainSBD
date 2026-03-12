import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import type { Contact } from '@/types';

export function useContacts() {
  const { environment } = useEnvironment();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(getCol(environment, 'contacts'), (snapshot) => {
      setContacts(snapshot.docs.map(d => d.data() as Contact));
      setLoading(false);
    });
    return unsub;
  }, [environment]);

  const addContact = useCallback(async (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    const contact: Contact = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const clean = Object.fromEntries(Object.entries(contact).filter(([, v]) => v !== undefined));
    await setDoc(getDocRef(environment, 'contacts', contact.id), clean);
    return contact;
  }, [environment]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    const clean = Object.fromEntries(
      Object.entries({ ...updates, updatedAt: new Date().toISOString() }).filter(([, v]) => v !== undefined)
    );
    await updateDoc(getDocRef(environment, 'contacts', id), clean);
  }, [environment]);

  const deleteContact = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, 'contacts', id));
  }, [environment]);

  const toggleFavorite = useCallback(async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    await updateDoc(getDocRef(environment, 'contacts', id), {
      favorite: !contact.favorite,
      updatedAt: new Date().toISOString(),
    });
  }, [environment, contacts]);

  const sortedContacts = useMemo(() =>
    [...contacts].sort((a, b) => a.name.localeCompare(b.name)),
    [contacts]
  );

  const favorites = useMemo(() =>
    contacts.filter(c => c.favorite),
    [contacts]
  );

  return {
    contacts: sortedContacts,
    favorites,
    loading,
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
  };
}
