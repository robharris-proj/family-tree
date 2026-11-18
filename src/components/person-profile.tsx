import { lifespan, personRelationships } from '../lib/relationships';
import type { LifeEvent, Person, Tree } from '../lib/types';
import { PersonAvatar } from './person-avatar';
import { PersonLink } from './person-link';

function EventList({ events }: { events: LifeEvent[] }) {
  return events.map((event, index) => (
    <div className="event" key={event.tag + index}>
      <strong>{event.name}</strong>
      {[event.date, event.place, event.detail, ...event.sources].filter(Boolean).map((text, detailIndex) => (
        <span key={detailIndex}>{text}</span>
      ))}
    </div>
  ));
}

export function PersonProfile({ tree, person, onSelect }: {
  tree: Tree;
  person: Person;
  onSelect: (id: string) => void;
}) {
  const relationships = personRelationships(person, tree);
  const familyEvents = person.partnerFamilies.flatMap(family => family.events);
  return (
    <section className="panel profile" aria-label="Selected person’s profile">
      <div className="profile-heading">
        <PersonAvatar sex={person.sex} />
        <div>
          <div className="label">Profile</div>
          <h2>{person.name}</h2>
          <p className="muted">{lifespan(person)}</p>
        </div>
      </div>
      <h3>Life events</h3>
      <EventList events={person.events} />
      {!person.events.length && <p className="muted">No life events recorded.</p>}
      <h3>Relationships</h3>
      {relationships.map(({ id, label }) => (
        <PersonLink key={id + label} person={tree.people.get(id)!} variant="relative" caption={label} onSelect={onSelect} />
      ))}
      {!relationships.length && <p className="muted">No relationships recorded.</p>}
      {familyEvents.length > 0 && <><h3>Family events</h3><EventList events={familyEvents} /></>}
    </section>
  );
}
