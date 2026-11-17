import { useMemo } from 'react';
import { PersonLink } from './person-link';
import type { Person } from '../lib/types';

interface Props {
  roster: Person[];
  selected: string;
  search: string;
  saving: boolean;
  onSelect: (id: string) => void;
  onSearch: (text: string) => void;
  onAdd: () => void;
  onSave: () => void;
}

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function PeopleDirectory({ roster, selected, search, saving, onSelect, onSearch, onAdd, onSave }: Props) {
  const matches = useMemo(() => {
    const query = normalize(search.trim());
    return roster.filter(person => normalize([person.name, ...person.events.map(event => event.place)].join(' ')).includes(query));
  }, [roster, search]);

  return (
    <section className="panel directory" aria-labelledby="people-title">
      <h2 id="people-title">People</h2>
      <div className="people-actions">
        <button type="button" className="action primary" onClick={onAdd}>Add person</button>
        <button type="button" className="action" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save GEDCOM'}</button>
      </div>
      <input
        className="search"
        type="search"
        placeholder="Search names or places"
        aria-label="Search names or places"
        value={search}
        onChange={event => onSearch(event.currentTarget.value)}
      />
      <div className="people">
        {matches.map(person => <PersonLink key={person.id} person={person} variant="person" selected={person.id === selected} onSelect={onSelect} />)}
        {!matches.length && <p className="muted">No matching people.</p>}
      </div>
    </section>
  );
}
