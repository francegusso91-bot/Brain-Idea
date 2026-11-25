import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { Folder, PointStatus } from './types';
import type { Classification } from './ai';

const STORAGE_KEY = 'brain-idea/folders/v1';

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

type Store = {
  loaded: boolean;
  folders: Folder[];
  /** Salva un'idea classificata dall'AI e restituisce la cartella in cui è finita. */
  addIdea: (fullText: string, result: Classification) => Folder;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  setPointStatus: (folderId: string, pointId: string, status: PointStatus) => void;
  addPoint: (folderId: string, text: string) => void;
  deletePoint: (folderId: string, pointId: string) => void;
  deleteIdea: (folderId: string, ideaId: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const foldersRef = useRef<Folder[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Folder[];
          foldersRef.current = parsed;
          setFolders(parsed);
        }
      })
      .catch((e) => console.warn('Impossibile leggere i dati salvati', e))
      .finally(() => setLoaded(true));
  }, []);

  const commit = useCallback((next: Folder[]) => {
    foldersRef.current = next;
    setFolders(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('Impossibile salvare i dati', e),
    );
  }, []);

  const updateFolder = useCallback(
    (folderId: string, fn: (f: Folder) => Folder) => {
      commit(
        foldersRef.current.map((f) => (f.id === folderId ? { ...fn(f), updatedAt: Date.now() } : f)),
      );
    },
    [commit],
  );

  const addIdea = useCallback(
    (fullText: string, r: Classification): Folder => {
      const now = Date.now();
      const idea = { id: newId(), fullText, simpleText: r.idea_simple, createdAt: now };
      const points = r.new_points
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ id: newId(), text, status: 'open' as const, createdAt: now }));

      const existing =
        r.decision === 'existing' ? foldersRef.current.find((f) => f.id === r.folder_id) : undefined;

      if (existing) {
        const updated: Folder = {
          ...existing,
          summary: r.folder_summary || existing.summary,
          ideas: [idea, ...existing.ideas],
          points: [...existing.points, ...points],
          updatedAt: now,
        };
        commit([updated, ...foldersRef.current.filter((f) => f.id !== existing.id)]);
        return updated;
      }

      const created: Folder = {
        id: newId(),
        name: r.new_folder_name.trim() || 'Nuova idea',
        summary: r.folder_summary,
        ideas: [idea],
        points,
        createdAt: now,
        updatedAt: now,
      };
      commit([created, ...foldersRef.current]);
      return created;
    },
    [commit],
  );

  const store: Store = {
    loaded,
    folders,
    addIdea,
    renameFolder: (id, name) => updateFolder(id, (f) => ({ ...f, name: name.trim() || f.name })),
    deleteFolder: (id) => commit(foldersRef.current.filter((f) => f.id !== id)),
    setPointStatus: (id, pointId, status) =>
      updateFolder(id, (f) => ({
        ...f,
        points: f.points.map((p) => (p.id === pointId ? { ...p, status } : p)),
      })),
    addPoint: (id, text) =>
      updateFolder(id, (f) => ({
        ...f,
        points: [...f.points, { id: newId(), text: text.trim(), status: 'open', createdAt: Date.now() }],
      })),
    deletePoint: (id, pointId) =>
      updateFolder(id, (f) => ({ ...f, points: f.points.filter((p) => p.id !== pointId) })),
    deleteIdea: (id, ideaId) =>
      updateFolder(id, (f) => ({ ...f, ideas: f.ideas.filter((i) => i.id !== ideaId) })),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve essere usato dentro StoreProvider');
  return ctx;
}
