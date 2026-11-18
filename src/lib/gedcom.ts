import type { Family, LifeEvent, MediaReference, Person, Tree } from './types';

interface RecordNode {
  id?: string;
  tag: string;
  value: string;
  children: RecordNode[];
}

const eventNames: Record<string, string> = {
  BIRT: 'Birth', CHR: 'Christening', BAPM: 'Baptism', ADOP: 'Adoption',
  DEAT: 'Death', BURI: 'Burial', CREM: 'Cremation', RESI: 'Residence',
  OCCU: 'Occupation', IMMI: 'Immigration', EMIG: 'Emigration',
  CENS: 'Census', MARR: 'Marriage', MARB: 'Marriage banns', DIV: 'Divorce', EVEN: 'Event',
};

const first = (node: RecordNode | undefined, tag: string) => node?.children.find(child => child.tag === tag);
const children = (node: RecordNode, tag: string) => node.children.filter(child => child.tag === tag);
const value = (node: RecordNode | undefined, tag: string) => first(node, tag)?.value || '';
export const year = (date: string) => date.match(/\b\d{3,4}\b/)?.[0] || '';

function readRecords(raw: string) {
  const roots: RecordNode[] = [];
  const stack: RecordNode[] = [];
  for (const line of raw.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)) {
    const match = line.match(/^(\d+)\s+(?:(@[^\s@]+@)\s+)?([A-Z0-9_]+)(?:[ \t]+(.*))?$/i);
    if (!match) continue;
    const [, depth, id, tag, content = ''] = match;
    const level = Number(depth);
    const node = { id, tag: tag.toUpperCase(), value: content.trim(), children: [] };
    if (level === 0) roots.push(node);
    else if (stack[level - 1]) stack[level - 1].children.push(node);
    else continue;
    stack[level] = node;
    stack.length = level + 1;
  }
  return roots;
}

function readEvents(record: RecordNode, sources: Map<string, string>): LifeEvent[] {
  return record.children.filter(node => Object.hasOwn(eventNames, node.tag)).map(node => ({
    tag: node.tag,
    name: value(node, 'TYPE') || eventNames[node.tag],
    date: value(node, 'DATE'),
    place: value(node, 'PLAC'),
    detail: node.value === 'Y' ? '' : node.value,
    sources: children(node, 'SOUR').map(source => {
      const title = sources.get(source.value) || (/^@.*@$/.test(source.value) ? '' : source.value);
      return [title, value(source, 'PAGE')].filter(Boolean).join(' · ');
    }).filter(Boolean),
  }));
}

function readMedia(person: RecordNode, objects: Map<string, RecordNode>): MediaReference[] {
  const media = new Map<string, MediaReference>();
  for (const [linkIndex, link] of children(person, 'OBJE').entries()) {
    const object = link.value ? objects.get(link.value) : link;
    if (!object) continue;
    const files = children(object, 'FILE');
    const primary = value(link, '_PRIM').toUpperCase() === 'Y';
    for (const [fileIndex, file] of (files.length ? files : [undefined]).entries()) {
      const id = object.id ? object.id + ':' + fileIndex : 'inline:' + linkIndex + ':' + fileIndex;
      const title = value(file, 'TITL') || value(object, 'TITL');
      const path = file?.value || '';
      const format = value(file, 'FORM') || value(object, 'FORM');
      if (!title && !path) continue;
      media.set(id, { id, title, path, format, primary: primary || media.get(id)?.primary === true });
    }
  }
  return [...media.values()].sort((a, b) => Number(b.primary) - Number(a.primary));
}

export function parseGedcom(raw: string): Tree {
  const sources = new Map<string, string>();
  const objects = new Map<string, RecordNode>();
  const people = new Map<string, Person>();
  const families: Family[] = [];
  const records = readRecords(raw);
  for (const record of records) {
    if (record.id && record.tag === 'SOUR') sources.set(record.id, value(record, 'TITL') || value(record, 'ABBR'));
    if (record.id && record.tag === 'OBJE') objects.set(record.id, record);
  }
  for (const record of records) {
    if (!record.id || record.tag !== 'INDI') continue;
    const name = first(record, 'NAME');
    const structured = [value(name, 'GIVN'), value(name, 'SURN')].filter(Boolean).join(' ');
    people.set(record.id, {
      id: record.id,
      name: name?.value.replaceAll('/', '').replace(/\s+/g, ' ').trim() || structured || 'Unknown name',
      surname: value(name, 'SURN') || name?.value.split('/')[1] || '',
      sex: value(record, 'SEX'),
      events: readEvents(record, sources).sort((a, b) => Number(year(a.date) || '9999') - Number(year(b.date) || '9999')),
      media: readMedia(record, objects),
      pedigree: new Map(children(record, 'FAMC').map(link => [link.value, value(link, 'PEDI')])),
      partnerLinks: children(record, 'FAMS').map(link => link.value),
      parentFamilies: [],
      partnerFamilies: [],
    });
  }
  if (!people.size) throw new Error('No individual records found in this GEDCOM file.');
  for (const record of records) {
    if (!record.id || record.tag !== 'FAM') continue;
    const partners = record.children.filter(node => ['HUSB', 'WIFE', 'PART'].includes(node.tag));
    families.push({
      id: record.id,
      parents: new Set(partners.map(node => node.value).filter(id => people.has(id))),
      children: new Set(children(record, 'CHIL').map(node => node.value).filter(id => people.has(id))),
      partnerTags: new Set(partners.map(node => node.tag).filter(tag => tag !== 'PART')),
      events: readEvents(record, sources),
    });
  }
  const links = new Map(families.map(family => [family.id, family]));
  for (const person of people.values()) {
    for (const id of person.pedigree.keys()) links.get(id)?.children.add(person.id);
    for (const id of person.partnerLinks) links.get(id)?.parents.add(person.id);
  }
  for (const family of families) {
    for (const id of family.children) people.get(id)?.parentFamilies.push(family);
    for (const id of family.parents) people.get(id)?.partnerFamilies.push(family);
  }
  return { people, families };
}

export function decodeGedcom(bytes: Uint8Array) {
  const charset = bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le'
    : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8';
  try {
    return new TextDecoder(charset, { fatal: true }).decode(bytes);
  } catch {
    const decoder = new TextDecoder('windows-1252');
    const header = decoder.decode(bytes.subarray(0, 8192));
    if (charset === 'utf-8' && /^1 CHAR (ANSI|WINDOWS-1252)\s*$/im.test(header)) return decoder.decode(bytes);
    throw new Error('This text encoding could not be read. Export the file as UTF-8 GEDCOM and try again.');
  }
}

export function gedcomForExport(raw: string) {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
    .replace(/(^0[ \t]+HEAD[ \t]*\n(?:(?!0[ \t])[^\n]*\n)*?^1[ \t]+CHAR[ \t]+)[^\n]+/im, '$1UTF-8');
}
