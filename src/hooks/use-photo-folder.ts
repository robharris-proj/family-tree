'use client';

import { useEffect, useState } from 'react';
import { indexPhotoFolder, type PhotoFolder } from '../lib/photo-folder';
import {
  directoryPicker, folderFromFiles, forgetPhotoFolder, loadPhotoFolder,
  photoReadPermission, readDirectoryImages, savePhotoFolder,
  type SavedPhotoFolder,
} from '../lib/photo-folder-storage';

type LinkedDirectory = Extract<SavedPhotoFolder, { kind: 'directory' }>;

export function usePhotoFolder() {
  const [folder, setFolder] = useState<PhotoFolder<File> | null>(null);
  const [disconnected, setDisconnected] = useState<LinkedDirectory | null>(null);
  const [canChooseDirectory, setCanChooseDirectory] = useState(false);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState('Restoring photo folder…');

  useEffect(() => {
    let active = true;
    setCanChooseDirectory(Boolean(directoryPicker()));
    async function restore() {
      let saved: SavedPhotoFolder | undefined;
      try {
        saved = await loadPhotoFolder();
        if (!active) return;
        if (saved?.kind === 'files') {
          setFolder(indexPhotoFolder(saved.name, saved.images));
        } else if (saved?.kind === 'directory') {
          const permission = await saved.handle.queryPermission(photoReadPermission);
          if (!active) return;
          if (permission === 'granted') {
            const images = await readDirectoryImages(saved.handle);
            if (active) setFolder(indexPhotoFolder(saved.handle.name, images));
          } else {
            if (saved.images) setFolder(indexPhotoFolder(saved.handle.name, saved.images));
            setDisconnected(saved);
          }
        }
        if (active) setStatus('');
      } catch {
        if (!active) return;
        if (saved?.kind === 'directory') {
          if (saved.images) setFolder(indexPhotoFolder(saved.handle.name, saved.images));
          setDisconnected(saved);
          setStatus(saved.images ? 'Showing photos saved in this browser.' : 'Could not read the saved folder.');
        } else {
          setStatus('Could not restore a saved photo folder.');
        }
      } finally {
        if (active) setBusy(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  async function link(source: SavedPhotoFolder, photos: PhotoFolder<File>) {
    setFolder(photos);
    setDisconnected(null);
    try {
      await savePhotoFolder(source);
      setStatus(source.kind === 'files' ? 'Photos saved in this browser.' : 'Photo folder remembered on this device.');
    } catch (error) {
      if (source.kind === 'directory') {
        try {
          if (error instanceof DOMException && error.name === 'DataCloneError' && source.images) {
            await savePhotoFolder({ kind: 'files', name: source.handle.name, images: source.images });
            setStatus('Photos saved in this browser.');
          } else {
            await savePhotoFolder({ kind: 'directory', handle: source.handle });
            setStatus('Folder remembered. Your browser may ask you to reconnect after a refresh.');
          }
          return;
        } catch {
          // The current photos remain available in memory when the browser cannot save them.
        }
      }
      setStatus('This folder is linked for this tab. Browser storage could not save the new link.');
    }
  }

  async function selectFiles(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    setStatus('Saving photos in this browser…');
    try {
      const source = folderFromFiles(files);
      await link(source, indexPhotoFolder(source.name, source.images));
    } finally {
      setBusy(false);
    }
  }

  async function chooseDirectory() {
    const choose = directoryPicker();
    if (!choose || busy) return;
    setBusy(true);
    setStatus('');
    try {
      const handle = await choose({ ...photoReadPermission, id: 'family-atlas-photos' });
      setStatus('Reading photos…');
      const images = await readDirectoryImages(handle);
      await link({ kind: 'directory', handle, images }, indexPhotoFolder(handle.name, images));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (error instanceof DOMException && error.name === 'SecurityError') {
        setCanChooseDirectory(false);
        setStatus('Use Link photo folder again to save local copies in this browser.');
      } else {
        setStatus('Could not read this folder. Choose it again or try another folder.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function reconnect() {
    if (!disconnected || busy) return;
    setBusy(true);
    setStatus('');
    try {
      const { handle } = disconnected;
      if (await handle.requestPermission(photoReadPermission) !== 'granted') {
        setStatus('Folder access is off. Reconnect it or choose another folder.');
        return;
      }
      const images = await readDirectoryImages(handle);
      await link({ kind: 'directory', handle, images }, indexPhotoFolder(handle.name, images));
    } catch {
      setStatus('Could not reconnect this folder. Choose it again or try another folder.');
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (busy) return;
    setBusy(true);
    setFolder(null);
    setDisconnected(null);
    try {
      await forgetPhotoFolder();
      setStatus('Photo folder unlinked.');
    } catch {
      setStatus('Unlinked for this tab. Browser storage could not remove the saved folder.');
    } finally {
      setBusy(false);
    }
  }

  return {
    folder, busy, status, canChooseDirectory, reconnectName: disconnected?.handle.name,
    chooseDirectory, selectFiles, reconnect, unlink,
  };
}
