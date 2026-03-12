import { useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import type { DocFolder, DocFile } from '@/types';

export function useDocuments() {
  const { environment } = useEnvironment();
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let foldersLoaded = false;
    let filesLoaded = false;
    const checkDone = () => { if (foldersLoaded && filesLoaded) setLoading(false); };

    const unsubFolders = onSnapshot(getCol(environment, 'folders'), (snapshot) => {
      setFolders(snapshot.docs.map(d => d.data() as DocFolder));
      foldersLoaded = true;
      checkDone();
    });

    const unsubFiles = onSnapshot(getCol(environment, 'files'), (snapshot) => {
      setFiles(snapshot.docs.map(d => d.data() as DocFile));
      filesLoaded = true;
      checkDone();
    });

    return () => { unsubFolders(); unsubFiles(); };
  }, [environment]);

  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    const folder: DocFolder = { id: uuid(), name, parentId, createdAt: new Date().toISOString() };
    await setDoc(getDocRef(environment, 'folders', folder.id), folder);
    return folder;
  }, [environment]);

  const deleteFolder = useCallback(async (id: string) => {
    const toDelete = new Set<string>();
    const queue = [id];
    while (queue.length) {
      const current = queue.shift()!;
      toDelete.add(current);
      folders.filter(f => f.parentId === current).forEach(f => queue.push(f.id));
    }
    await Promise.all([...toDelete].map(fid => deleteDoc(getDocRef(environment, 'folders', fid))));
    const filesToDelete = files.filter(f => f.folderId && toDelete.has(f.folderId));
    await Promise.all(filesToDelete.map(async (f) => {
      await deleteObject(ref(storage, `environments/${environment}/files/${f.id}`)).catch(() => {});
      await deleteDoc(getDocRef(environment, 'files', f.id));
    }));
  }, [environment, folders, files]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    await updateDoc(getDocRef(environment, 'folders', id), { name });
  }, [environment]);

  const uploadFile = useCallback(async (file: File, folderId: string | null = null): Promise<DocFile> => {
    const id = uuid();
    const storageRef = ref(storage, `environments/${environment}/files/${id}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    const docFile: DocFile = {
      id,
      name: file.name,
      folderId,
      type: file.type,
      size: file.size,
      downloadUrl,
      createdAt: new Date().toISOString(),
    };
    await setDoc(getDocRef(environment, 'files', id), docFile);
    return docFile;
  }, [environment]);

  const deleteFile = useCallback(async (id: string) => {
    await deleteObject(ref(storage, `environments/${environment}/files/${id}`)).catch(() => {});
    await deleteDoc(getDocRef(environment, 'files', id));
  }, [environment]);

  const moveFile = useCallback(async (fileId: string, folderId: string | null) => {
    await updateDoc(getDocRef(environment, 'files', fileId), { folderId });
  }, [environment]);

  const getFolderContents = useCallback((folderId: string | null) => ({
    subfolders: folders.filter(f => f.parentId === folderId),
    files: files.filter(f => f.folderId === folderId),
  }), [folders, files]);

  const getBreadcrumbs = useCallback((folderId: string | null): DocFolder[] => {
    const crumbs: DocFolder[] = [];
    let current = folderId;
    while (current) {
      const folder = folders.find(f => f.id === current);
      if (folder) { crumbs.unshift(folder); current = folder.parentId; }
      else break;
    }
    return crumbs;
  }, [folders]);

  return {
    folders, files, loading,
    createFolder, deleteFolder, renameFolder,
    uploadFile, deleteFile, moveFile,
    getFolderContents, getBreadcrumbs,
  };
}
