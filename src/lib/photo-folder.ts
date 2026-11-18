import type { MediaReference } from './types';

const imageExtension = /\.(avif|bmp|gif|jpe?g|jfif|png|webp)$/i;
export const isPhotoFilename = (name: string) => imageExtension.test(name);

const normalize = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const titleKey = (name: string) => normalize(name.trim().replace(imageExtension, ''));
const pathKey = (path: string) => path.replaceAll('\\', '/').replace(/^(?:\.\/)+/, '')
  .split('/').map(normalize).join('/');

export function isPhotoReference(media: MediaReference) {
  const format = media.format.replace(/^image\//i, '');
  if (format) return imageExtension.test('.' + format) || imageExtension.test(media.path);
  return !/\.[a-z0-9]{2,8}$/i.test(media.path) || imageExtension.test(media.path);
}

export interface FolderImage<T extends { name: string } = File> {
  file: T;
  path: string;
}

export interface PhotoFolder<T> {
  name: string;
  imageCount: number;
  byPath: Map<string, T[]>;
  byFilename: Map<string, T[]>;
  byTitle: Map<string, T[]>;
}

export function indexPhotoFolder<T extends { name: string }>(
  name: string,
  images: readonly FolderImage<T>[],
): PhotoFolder<T> {
  const folder: PhotoFolder<T> = {
    name,
    imageCount: 0,
    byPath: new Map(),
    byFilename: new Map(),
    byTitle: new Map(),
  };
  function index(map: Map<string, T[]>, key: string, file: T) {
    if (!key) return;
    const entries = map.get(key);
    if (entries) entries.push(file);
    else map.set(key, [file]);
  }

  for (const { file, path } of images) {
    if (!isPhotoFilename(file.name)) continue;
    folder.imageCount++;
    const fullPath = pathKey(path);
    const slash = fullPath.indexOf('/');
    if (slash >= 0) index(folder.byPath, fullPath.slice(slash + 1), file);
    index(folder.byPath, fullPath, file);
    index(folder.byFilename, normalize(file.name), file);
    index(folder.byTitle, titleKey(file.name), file);
  }
  return folder;
}

export type PhotoMatch<T> = { status: 'matched'; file: T } | { status: 'ambiguous' | 'missing' };

export function matchPhoto<T>(media: MediaReference, folder: PhotoFolder<T>): PhotoMatch<T> {
  const path = pathKey(media.path);
  const name = path.split('/').pop() || '';
  const candidates = [
    path.includes('/') ? folder.byPath.get(path) : undefined,
    name ? folder.byFilename.get(name) : undefined,
    media.title ? folder.byTitle.get(titleKey(media.title)) : undefined,
  ];
  for (const matches of candidates) {
    if (matches?.length === 1) return { status: 'matched', file: matches[0] };
  }
  return { status: candidates.some(matches => matches?.length) ? 'ambiguous' : 'missing' };
}
