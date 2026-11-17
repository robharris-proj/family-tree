import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sampleDocument } from '../src/data/sample';
import { addPerson } from '../src/lib/add-person';
import { decodeGedcom, gedcomForExport, parseGedcom } from '../src/lib/gedcom';
import { eligibleFamilies, personRelationships } from '../src/lib/relationships';
import { exportFilename, saveGedcomFile } from '../src/lib/save-file';
import { readDraft, STORAGE_KEY, writeDraft } from '../src/lib/storage';
import type { PersonFields, TreeDocument } from '../src/lib/types';

const sample = sampleDocument.raw;
const fields: PersonFields = {
  given: 'Ángela', surname: 'Williams',
  birthDate: '2 MAR 1891', birthPlace: 'Oslo',
  deathDate: '', deathPlace: '',
};
const draft: TreeDocument = { raw: sample, filename: '555Sample.ged', edited: true };

test('reads the sample, both family records, adoption, and source citations', () => {
  const tree = parseGedcom(sample);
  assert.equal(tree.people.size, 3);
  assert.equal(tree.families.length, 2);
  const joe = tree.people.get('@I3@')!;
  assert.equal(joe.pedigree.get('@F2@'), 'adopted');
  assert.equal(joe.parentFamilies.length, 2);
  assert(personRelationships(joe, tree).some(link => link.label === 'Parent · adopted'));
  assert.match(tree.people.get('@I1@')!.events[0].sources[0], /Sec\. 2, p\. 45/);
});

test('opens UTF-8, UTF-16, and ANSI GEDCOM while rejecting missing people', () => {
  assert.equal(decodeGedcom(Buffer.from(sample)), sample);
  assert.equal(decodeGedcom(Buffer.from('\uFEFF' + sample, 'utf16le')), sample);
  const ansi = '0 HEAD\n1 CHAR ANSI\n0 @I@ INDI\n1 NAME Andrés /García/\n0 TRLR\n';
  assert.equal(parseGedcom(decodeGedcom(Buffer.from(ansi, 'latin1'))).people.get('@I@')!.name, 'Andrés García');
  assert.throws(() => parseGedcom('0 HEAD\n0 TRLR'), /No individual records/);
});

test('adds records and keeps source and repository records intact', () => {
  const result = addPerson(sample, fields, '');
  const tree = parseGedcom(result.raw);
  assert.equal(tree.people.size, 4);
  const person = tree.people.get(result.personId)!;
  assert.equal(person.name, 'Ángela Williams');
  assert.equal(person.events[0].place, 'Oslo');
  assert.match(result.raw, /0 @R1@ REPO/);
  assert.match(result.raw, /2 SOUR @S1@/);
  assert.match(result.raw, /0 TRLR\n$/);
  assert.throws(() => addPerson(sample, { ...fields, given: '', surname: '' }, ''), /Enter a given name/);
});

test('adds a parent, child, partner, and sibling to the selected family branch', () => {
  const tree = parseGedcom(sample);
  const joe = tree.people.get('@I3@')!;
  const robert = tree.people.get('@I1@')!;
  const parent = addPerson(sample, fields, 'parent', joe, eligibleFamilies('parent', joe)[0]);
  assert.equal(parseGedcom(parent.raw).people.get(parent.personId)!.partnerFamilies[0].id, '@F2@');
  const child = addPerson(sample, fields, 'child', robert, eligibleFamilies('child', robert)[0]);
  assert(parseGedcom(child.raw).people.get(child.personId)!.parentFamilies[0].parents.has('@I2@'));
  const partner = addPerson(sample, fields, 'partner', robert);
  assert(parseGedcom(partner.raw).people.get(partner.personId)!.partnerFamilies[0].parents.has('@I1@'));
  const sibling = addPerson(sample, fields, 'sibling', joe, eligibleFamilies('sibling', joe)[0]);
  const siblings = parseGedcom(sibling.raw).people.get(sibling.personId)!.parentFamilies[0].children;
  assert(siblings.has('@I3@'));
  assert(siblings.has(sibling.personId));
});

test('writes and restores a draft and protects a saved tree from a stale tab', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const saved = writeDraft(storage, null, draft);
  assert.equal(readDraft(saved.serialized!).raw, sample);
  assert.equal(readDraft(values.get(STORAGE_KEY)!).edited, true);
  const stale = writeDraft(storage, null, { ...draft, filename: 'stale.ged' });
  assert.match(stale.status, /Another tab/);
  assert.equal(readDraft(values.get(STORAGE_KEY)!).filename, draft.filename);
});

test('normalizes export encoding and writes a new filename through Save As', async context => {
  assert.equal(exportFilename('555SAMPLE.GED.txt'), '555SAMPLE-updated.ged');
  assert.match(gedcomForExport('0 HEAD\r1 CHAR ANSI\r0 TRLR'), /1 CHAR UTF-8/);
  const writes: string[] = [];
  const fakeWindow = {
    async showSaveFilePicker(options: { suggestedName: string }) {
      assert.equal(options.suggestedName, '555Sample-updated.ged');
      return {
        name: 'copy.ged',
        createWritable: async () => ({
          write: async (file: Blob) => { writes.push(await file.text()); },
          close: async () => { writes.push('closed'); },
        }),
      };
    },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  context.after(() => Reflect.deleteProperty(globalThis, 'window'));
  assert.equal(await saveGedcomFile(draft), 'Saved copy.ged.');
  assert.equal(parseGedcom(writes[0]).people.size, 3);
  assert.equal(writes[1], 'closed');
  fakeWindow.showSaveFilePicker = async () => { throw new DOMException('Canceled', 'AbortError'); };
  assert.equal(await saveGedcomFile(draft), null);
});
