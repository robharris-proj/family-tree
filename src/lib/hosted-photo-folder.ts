import { indexPhotoFolder, isPhotoFilename } from './photo-folder';

export interface HostedPhoto {
  name: string;
  url: string;
}

const isRelativePath = (path: unknown): path is string =>
  typeof path === 'string' && path.split('/').every(part =>
    part && part !== '.' && part !== '..' && !/[\\:\x00-\x1F\x7F]/.test(part));

export function readHostedPhotoFolder(config: unknown, basePath = '') {
  if (!config || typeof config !== 'object') return null;
  const { folder, images } = config as { folder?: unknown; images?: unknown };
  if (!isRelativePath(folder) || !Array.isArray(images)) return null;

  const entries = [];
  for (const path of new Set(images)) {
    if (!isRelativePath(path) || !isPhotoFilename(path)) continue;
    const fullPath = folder + '/' + path;
    const url = basePath + '/' + fullPath.split('/').map(encodeURIComponent).join('/');
    entries.push({ path: fullPath, file: { name: path.split('/').at(-1)!, url } });
  }
  return entries.length ? indexPhotoFolder<HostedPhoto>(folder, entries) : null;
}

export async function loadHostedPhotoFolder(signal: AbortSignal) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const response = await fetch(basePath + '/photo-folder.json', { signal, cache: 'no-cache' });
  if (!response.ok) return null;
  return readHostedPhotoFolder(await response.json(), basePath);
}
