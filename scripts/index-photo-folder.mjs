import { readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const folder = process.argv[2] || 'photos';
const segments = folder.split('/');
if (segments.some(part => !part || part === '.' || part === '..' || /[\\:\x00-\x1F\x7F]/.test(part))) {
  throw new Error('Enter a relative folder inside public, such as photos or photos/harris.');
}
const publicDir = resolve('public');
const images = [];
const supportedImage = /\.(avif|bmp|gif|jpe?g|jfif|png|webp)$/i;

async function scan(path, prefix = '') {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const relativePath = prefix + entry.name;
    if (entry.isDirectory()) await scan(join(path, entry.name), relativePath + '/');
    else if (entry.isFile() && supportedImage.test(entry.name)) images.push(relativePath);
  }
}

await scan(join(publicDir, ...segments));
images.sort();
await writeFile(join(publicDir, 'photo-folder.json'), JSON.stringify({ folder, images }, null, 2) + '\n');
console.log('Saved public/photo-folder.json with ' + images.length + ' image paths.');
