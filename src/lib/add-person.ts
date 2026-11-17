import type { Family, Person, PersonFields, Relationship } from './types';

export function addPerson(
  raw: string,
  fields: PersonFields,
  relationship: Relationship,
  relative?: Person,
  family?: Family,
) {
  const records = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trimEnd().split(/(?=^0[ \t])/m);
  const recordsById = new Map<string, number>();
  for (const [index, record] of records.entries()) {
    const id = record.match(/^0\s+(@[^\s@]+@)\s/)?.[1];
    if (id) recordsById.set(id, index);
  }
  function nextId(prefix: string) {
    let number = 1;
    while (recordsById.has('@' + prefix + number + '@')) number++;
    return '@' + prefix + number + '@';
  }
  function appendLink(id: string, tag: string, pointer: string) {
    const index = recordsById.get(id);
    if (index === undefined) throw new Error('The selected record is no longer in the tree.');
    records[index] = records[index].trimEnd() + '\n1 ' + tag + ' ' + pointer + '\n';
  }

  const personId = nextId('I');
  const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
  const given = clean(fields.given);
  const surname = clean(fields.surname);
  if (!given && !surname) throw new Error('Enter a given name or a surname.');
  if (given.includes('/') || surname.includes('/')) throw new Error('Names cannot contain a slash.');
  const name = [given, surname && '/' + surname + '/'].filter(Boolean).join(' ');
  const personLines = ['0 ' + personId + ' INDI', '1 NAME ' + name];

  const events = [
    { tag: 'BIRT', date: clean(fields.birthDate), place: clean(fields.birthPlace) },
    { tag: 'DEAT', date: clean(fields.deathDate), place: clean(fields.deathPlace) },
  ];
  for (const { tag, date, place } of events) {
    if (!date && !place) continue;
    personLines.push('1 ' + tag);
    if (date) personLines.push('2 DATE ' + date);
    if (place) personLines.push('2 PLAC ' + place);
  }

  const additions = [personLines];
  if (relationship) {
    if (!relative) throw new Error('Choose an existing person.');
    const child = relationship === 'child' || relationship === 'sibling';
    const relativeIsChild = relationship === 'parent' || relationship === 'sibling';
    const familyId = family?.id || nextId('F');
    personLines.push('1 ' + (child ? 'FAMC' : 'FAMS') + ' ' + familyId);
    if (family) {
      const role = child ? 'CHIL' : family.partnerTags.has('HUSB') ? 'WIFE' : 'HUSB';
      appendLink(familyId, role, personId);
    } else {
      const relativeRole = relativeIsChild ? 'CHIL' : relative.sex === 'F' ? 'WIFE' : 'HUSB';
      const role = child ? 'CHIL' : relativeRole === 'HUSB' ? 'WIFE' : 'HUSB';
      additions.push(['0 ' + familyId + ' FAM', '1 ' + relativeRole + ' ' + relative.id, '1 ' + role + ' ' + personId]);
      appendLink(relative.id, relativeIsChild ? 'FAMC' : 'FAMS', familyId);
    }
  }
  const trailer = records.findIndex(record => /^0\s+TRLR\s*$/i.test(record));
  if (trailer === -1) records.push('0 TRLR');
  const position = trailer === -1 ? records.length - 1 : trailer;
  records.splice(position, 0, ...additions.map(record => record.join('\n')));
  return { raw: records.map(record => record.trimEnd()).filter(Boolean).join('\n') + '\n', personId };
}
