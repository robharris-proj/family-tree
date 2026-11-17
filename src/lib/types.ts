export interface LifeEvent {
  tag: string;
  name: string;
  date: string;
  place: string;
  detail: string;
  sources: string[];
}

export interface Person {
  id: string;
  name: string;
  surname: string;
  sex: string;
  events: LifeEvent[];
  pedigree: Map<string, string>;
  partnerLinks: string[];
  parentFamilies: Family[];
  partnerFamilies: Family[];
}

export interface Family {
  id: string;
  parents: Set<string>;
  children: Set<string>;
  partnerTags: Set<string>;
  events: LifeEvent[];
}

export interface Tree {
  people: Map<string, Person>;
  families: Family[];
}

export interface TreeDocument {
  raw: string;
  filename: string;
  initialId?: string;
  initialTitle?: string;
  edited: boolean;
}

export type Relationship = '' | 'parent' | 'child' | 'partner' | 'sibling';
export type TreeView = 'family' | 'ancestors' | 'descendants';

export interface PersonFields {
  given: string;
  surname: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
}
