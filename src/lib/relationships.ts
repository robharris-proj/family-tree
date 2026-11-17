import { year } from './gedcom';
import type { Family, Person, Relationship, Tree } from './types';

export function lifespan(person: Person) {
  const born = year(person.events.find(event => event.tag === 'BIRT')?.date || '');
  const died = year(person.events.find(event => event.tag === 'DEAT')?.date || '');
  if (born && died) return born + '–' + died;
  if (born) return 'Born ' + born;
  return died ? 'Died ' + died : '';
}

export function eligibleFamilies(relationship: Relationship, relative?: Person) {
  if (!relative) return [];
  if (relationship === 'child') return relative.partnerFamilies;
  if (relationship === 'sibling') return relative.parentFamilies;
  if (relationship === 'parent') {
    return relative.parentFamilies.filter(family => family.parents.size < 2 && family.partnerTags.size < 2);
  }
  return [];
}

export function familyLabel(tree: Tree, family: Family, relative: Person, relationship: Relationship) {
  const names = [...family.parents].filter(id => relationship !== 'child' || id !== relative.id)
    .map(id => tree.people.get(id)?.name).filter(Boolean).join(' & ');
  const label = relationship === 'child' ? (names ? 'With ' + names : 'No other parent recorded') : names || 'Parents unrecorded';
  return [label, relative.pedigree.get(family.id), family.id.replaceAll('@', '')].filter(Boolean).join(' · ');
}

export function personRelationships(person: Person, tree: Tree) {
  const links = new Map<string, { id: string; label: string }>();
  const add = (id: string, label: string, pedigree?: string) => {
    if (id === person.id) return;
    const title = pedigree ? label + ' · ' + pedigree : label;
    links.set(id + title, { id, label: title });
  };
  for (const family of person.parentFamilies) {
    for (const id of family.parents) add(id, 'Parent', person.pedigree.get(family.id));
    for (const id of family.children) add(id, 'Sibling');
  }
  for (const family of person.partnerFamilies) {
    for (const id of family.parents) add(id, 'Partner');
    for (const id of family.children) add(id, 'Child', tree.people.get(id)?.pedigree.get(family.id));
  }
  return [...links.values()];
}
