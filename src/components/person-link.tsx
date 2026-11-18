import { isDeceased, lifespan } from '../lib/relationships';
import type { Person } from '../lib/types';

interface Props {
  person: Person;
  variant: 'person' | 'card' | 'relative';
  caption?: string;
  selected?: boolean;
  onSelect: (id: string) => void;
}

export function PersonLink({ person, variant, caption, selected, onSelect }: Props) {
  const dates = lifespan(person);
  const isTreeCard = variant === 'card';
  const deceased = isTreeCard && isDeceased(person);
  const subtitle = isTreeCard ? caption : caption ?? dates;
  const initials = person.name.split(' ').slice(0, 2).map(word => Array.from(word)[0]).join('');
  const className = variant === 'card' && selected ? 'card focus' : variant;
  return (
    <button type="button" className={className} aria-current={selected || undefined} onClick={() => onSelect(person.id)}>
      {variant === 'person' && <span className="avatar" aria-hidden="true">{initials}</span>}
      <span>
        {person.name}
        {subtitle && <small>{subtitle}</small>}
        {isTreeCard && (dates || deceased) && (
          <small className="tree-card-lifespan">
            {deceased && (
              <span className="headstone" role="img" aria-label="Deceased" aria-hidden={!dates || undefined} title="Deceased">
                🪦
              </span>
            )}
            <span>{dates || 'Deceased'}</span>
          </small>
        )}
      </span>
    </button>
  );
}
