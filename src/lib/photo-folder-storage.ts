import { isPhotoFilename, type FolderImage } from './photo-folder';

interface DirectoryHandle extends FileSystemDirectoryHandle {
  values(): AsyncIterable<FileSystemHandle>;
  queryPermission(options: { mode: 'read' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'read' }): Promise<PermissionState>;
}

type DirectoryPicker = (options: { mode: 'read'; id: string }) => Promise<DirectoryHandle>;

export type SavedPhotoFolder =
  | { kind: 'directory'; handle: DirectoryHandle; images?: FolderImage[] }
  | { kind: 'files'; name: string; images: FolderImage[] };

interface StoredImage {
  data: Blob;
  name: string;
  path: string;
  lastModified: number;
}

type StoredPhotoFolder =
  | { kind: 'directory'; handle: DirectoryHandle; images?: StoredImage[] }
  | { kind: 'files'; name: string; images: StoredImage[] };

export const photoReadPermission = { mode: 'read' } as const;

export function directoryPicker() {
  const host = window as Window & { showDirectoryPicker?: DirectoryPicker };
  return host.showDirectoryPicker?.bind(host);
}

export function folderFromFiles(files: readonly File[]): Extract<SavedPhotoFolder, { kind: 'files' }> {
  const name = files[0]?.webkitRelativePath?.split('/')[0] || 'Selected photos';
  const images = files.filter(file => isPhotoFilename(file.name)).map(file => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
  return { kind: 'files', name, images };
}

export async function readDirectoryImages(handle: DirectoryHandle): Promise<FolderImage[]> {
  const images: FolderImage[] = [];

  async function scan(directory: DirectoryHandle, path: string) {
    for await (const entry of directory.values()) {
      const childPath = path + '/' + entry.name;
      if (entry.kind === 'directory') {
        await scan(entry as DirectoryHandle, childPath);
      } else if (isPhotoFilename(entry.name)) {
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          images.push({ file, path: childPath });
        } catch (error) {
          if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error;
        }
      }
    }
  }

  await scan(handle, handle.name);
  return images;
}

const databaseName = 'family-atlas-photo-folders';
const storeName = 'folders';
const folderKey = 'active';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('Browser storage is unavailable.'));
      return;
    }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function folderTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error || request.error);
    });
  } finally {
    database.close();
  }
}

export async function loadPhotoFolder(): Promise<SavedPhotoFolder | undefined> {
  const stored = await folderTransaction<StoredPhotoFolder | undefined>('readonly', store => store.get(folderKey));
  if (!stored) return;
  function restoreImage({ data, name, path, lastModified }: StoredImage) {
    return { file: new File([data], name, { type: data.type, lastModified }), path };
  }
  return stored.kind === 'files'
    ? { ...stored, images: stored.images.map(restoreImage) }
    : { ...stored, images: stored.images?.map(restoreImage) };
}

export async function savePhotoFolder(folder: SavedPhotoFolder) {
  function storeImage({ file, path }: FolderImage): StoredImage {
    return { data: file.slice(0, file.size, file.type), name: file.name, lastModified: file.lastModified, path };
  }
  const stored: StoredPhotoFolder = folder.kind === 'files'
    ? { ...folder, images: folder.images.map(storeImage) }
    : { ...folder, images: folder.images?.map(storeImage) };
  await folderTransaction('readwrite', store => store.put(stored, folderKey));
}

export async function forgetPhotoFolder() {
  await folderTransaction('readwrite', store => store.delete(folderKey));
}
