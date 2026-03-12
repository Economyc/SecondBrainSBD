import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import type { NotePage } from '@/types';

export function usePages() {
  const { environment } = useEnvironment();
  const [pages, setPages] = useState<NotePage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(getCol(environment, 'pages'), (snapshot) => {
      setPages(snapshot.docs.map(d => d.data() as NotePage));
      setLoading(false);
    });
    return unsub;
  }, [environment]);

  const addPage = useCallback(async (title: string, folderId?: string | null) => {
    const page: NotePage = {
      id: uuid(),
      title: title,
      content: '',
      folderId: folderId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(getDocRef(environment, 'pages', page.id), page);
    return page;
  }, [environment]);

  const updatePage = useCallback(async (id: string, updates: Partial<NotePage>) => {
    await updateDoc(getDocRef(environment, 'pages', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }, [environment]);

  const deletePage = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, 'pages', id));
  }, [environment]);

  const sortedPages = useMemo(() =>
    [...pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [pages]
  );

  return { pages: sortedPages, loading, addPage, updatePage, deletePage };
}
