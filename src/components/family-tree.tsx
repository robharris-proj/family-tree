import { lifespan } from '../lib/relationships';
import type { Person, Tree, TreeView } from '../lib/types';
import { PersonLink } from './person-link';

interface Props {
  tree: Tree;
  person: Person;
  view: TreeView;
  onSelect: (id: string) => void;
  onView: (view: TreeView) => void;
}

interface Group {
  id: string;
  title: string;
  members: { id: string; caption?: string }[];
}

export function FamilyTree({ tree, person, view, onSelect, onView }: Props) {
  const parentGroups: Group[] = view === 'descendants' ? [] : person.parentFamilies.map(family => {
    const pedigree = person.pedigree.get(family.id);
    return {
      id: family.id,
      title: pedigree ? 'Parents · ' + pedigree : 'Parents',
      members: [...family.parents].map(id => ({ id })),
    };
  });
  const householdGroups: Group[] = view === 'ancestors' ? [] : person.partnerFamilies.flatMap(family => {
    const partners = [...family.parents].filter(id => id !== person.id);
    const children = [...family.children];
    if (!partners.length && !children.length) return [];
    const marriage = family.events.find(event => event.tag === 'MARR');
    const roles = [partners.length && 'Partner', children.length && (children.length === 1 ? 'Child' : 'Children')].filter(Boolean);
    const members = [...new Set([...partners, ...children])].map(id => {
      const relative = tree.people.get(id)!;
      const pedigree = relative.pedigree.get(family.id);
      const caption = partners.includes(id) ? ['Partner', lifespan(relative)].filter(Boolean).join(' · ')
        : pedigree ? 'Child · ' + pedigree : 'Child';
      return { id, caption };
    });
    return [{ id: family.id, title: roles.join(' & ') + (marriage?.date ? ' · ' + marriage.date : ''), members }];
  });

  function renderGroup(group: Group) {
    return (
      <div className="family" key={group.id}>
        <div className="label relation">{group.title}</div>
        <div className="connector" aria-hidden="true" />
        <div className="group">
          {group.members.map(({ id, caption }) => (
            <PersonLink key={id} person={tree.people.get(id)!} variant="card" caption={caption} onSelect={onSelect} />
          ))}
          {!group.members.length && <p className="muted">No people recorded</p>}
        </div>
      </div>
    );
  }

  return (
    <section className="panel" aria-labelledby="tree-title">
      <div className="tree-head">
        <h2 id="tree-title">Family tree</h2>
        <select aria-label="Tree view" value={view} onChange={event => onView(event.currentTarget.value as TreeView)}>
          <option value="family">Family connections</option>
          <option value="ancestors">Parents</option>
          <option value="descendants">Partners &amp; children</option>
        </select>
      </div>
      <div className="tree-body">
        {parentGroups.map(renderGroup)}
        {parentGroups.length > 0 && <div className="connector" aria-hidden="true" />}
        <div className="group"><PersonLink person={person} variant="card" selected onSelect={onSelect} /></div>
        {householdGroups.length > 0 && <div className="connector" aria-hidden="true" />}
        {householdGroups.map(renderGroup)}
        {!parentGroups.length && !householdGroups.length && <p className="muted tree-empty">No relatives recorded in this view.</p>}
      </div>
    </section>
  );
}
