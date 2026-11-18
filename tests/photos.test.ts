import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PersonProfile } from '../src/components/person-profile';
import { PhotoFolderPicker } from '../src/components/photo-folder-picker';
import { ProfilePhotos } from '../src/components/profile-photos';
import { parseGedcom } from '../src/lib/gedcom';
import { loadHostedPhotoFolder, readHostedPhotoFolder } from '../src/lib/hosted-photo-folder';
import { indexPhotoFolder, isPhotoReference, matchPhoto } from '../src/lib/photo-folder';
import { folderFromFiles } from '../src/lib/photo-folder-storage';

const tree = parseGedcom([
  '0 @I1@ INDI',
  '1 NAME Example /Person/',
  '1 OBJE @O1@',
  '1 OBJE @O2@',
  '2 _PRIM Y',
  '1 OBJE @O3@',
  '1 OBJE',
  '2 FILE',
  '3 TITL Family picnic',
  '0 @I2@ INDI',
  '1 NAME Another /Person/',
  '1 OBJE @O2@',
  '0 @O1@ OBJE',
  '1 FILE',
  '2 FORM jpg',
  '2 TITL André  and Sam',
  '0 @O2@ OBJE',
  '1 FILE photos\\Portrait.jpg',
  '2 FORM jpg',
  '2 TITL Person portrait',
  '0 @O3@ OBJE',
  '1 FILE document.pdf',
  '2 FORM pdf',
  '2 TITL Birth certificate',
  '0 TRLR',
].join('\n'));

const person = tree.people.get('@I1@')!;
const [preferred, groupPhoto, document, inline] = person.media;
function file(path: string) {
  const name = path.split('/').pop()!;
  return Object.assign(new File(['image'], name), { webkitRelativePath: path });
}

function indexFiles(files: File[]) {
  const selected = folderFromFiles(files);
  return indexPhotoFolder(selected.name, selected.images);
}

test('reads blank FILE titles, inline photos, and person-specific preferred links', () => {
  assert.equal(preferred.id, '@O2@:0');
  assert.equal(preferred.primary, true);
  assert.equal(tree.people.get('@I2@')!.media[0].primary, false);
  assert.equal(groupPhoto.title, 'André  and Sam');
  assert.equal(groupPhoto.path, '');
  assert.equal(inline.title, 'Family picnic');
});

test('matches title files by normalized spelling and extension, and prefers an exact path', () => {
  const group = file('Family Folder/2020/ANDRE\u0301 AND SAM.JPEG');
  const portrait = file('Family Folder/photos/Portrait.jpg');
  const folder = indexFiles([
    group, portrait, file('Family Folder/duplicates/Portrait.jpg'),
    file('Family Folder/Person portrait.png'), file('Family Folder/document.pdf'),
  ]);
  assert.equal(folder.name, 'Family Folder');
  assert.equal(folder.imageCount, 4);
  assert.deepEqual(matchPhoto(groupPhoto, folder), { status: 'matched', file: group });
  assert.deepEqual(matchPhoto(preferred, folder), { status: 'matched', file: portrait });
  assert.deepEqual(matchPhoto(document, folder), { status: 'missing' });
});

test('reports ambiguous titles in the photo gallery, outside the profile sidebar', () => {
  const folder = indexFiles([
    file('Family Folder/A/André and Sam.jpg'),
    file('Family Folder/B/andré AND SAM.png'),
  ]);
  assert.deepEqual(matchPhoto(groupPhoto, folder), { status: 'ambiguous' });
  const html = renderToStaticMarkup(createElement(ProfilePhotos, {
    photos: person.media.filter(isPhotoReference), match: photo => matchPhoto(photo, folder),
  }));
  assert.match(html, /Multiple files match this title/);
  assert.match(html, /No matching image in this folder/);
  assert(!html.includes('Birth certificate'));
  const sidebar = renderToStaticMarkup(createElement(PersonProfile, { tree, person, onSelect() {} }));
  assert(!sidebar.includes('photos-title'));
});

test('renders a native directory input with an accessible label', () => {
  const html = renderToStaticMarkup(createElement(PhotoFolderPicker, {
    folder: null, busy: false, status: '', canChooseDirectory: false,
    chooseDirectory() {}, selectFiles() {}, reconnect() {}, unlink() {},
  }));
  assert.match(html, /<label[^>]*>Link photo folder<input[^>]*webkitdirectory=""/);
});

test('offers to reconnect a saved directory while displaying saved photos', () => {
  const html = renderToStaticMarkup(createElement(PhotoFolderPicker, {
    folder: { name: 'Photos', imageCount: 2 }, busy: false, status: '', canChooseDirectory: true,
    reconnectName: 'Photos', chooseDirectory() {}, selectFiles() {}, reconnect() {}, unlink() {},
  }));
  assert.match(html, /Reconnect photo folder/);
  assert.match(html, /Showing saved photos/);
});

test('loads a website photo manifest on startup and matches URL-encoded image filenames', async context => {
  const config = { folder: 'photos', images: ['Album/André and Sam.jpg', 'photos/Portrait.jpg', '../outside.jpg'] };
  const expected = readHostedPhotoFolder(config, '/family-tree')!;
  assert.equal(expected.imageCount, 2);
  assert.deepEqual(matchPhoto(groupPhoto, expected), {
    status: 'matched',
    file: { name: 'André and Sam.jpg', url: '/family-tree/photos/Album/Andr%C3%A9%20and%20Sam.jpg' },
  });
  assert.equal(readHostedPhotoFolder({ folder: 'C:\\Photos', images: ['x.jpg'] }), null);
  context.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.match(url, /\/photo-folder\.json$/);
    return Response.json(config);
  });
  const folder = await loadHostedPhotoFolder(new AbortController().signal);
  assert.equal(folder?.imageCount, 2);
  const html = renderToStaticMarkup(createElement(ProfilePhotos, {
    photos: [groupPhoto], match: photo => matchPhoto(photo, expected),
  }));
  assert.match(html, /Andr%C3%A9%20and%20Sam\.jpg/);
  assert.match(html, /aria-haspopup="dialog"/);
});
