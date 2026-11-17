import { type FormEvent, useEffect, useRef, useState } from 'react';
import { eligibleFamilies, familyLabel, lifespan } from '../lib/relationships';
import type { Person, PersonFields, Relationship, Tree } from '../lib/types';

interface Props {
  tree: Tree;
  roster: Person[];
  selected: string;
  onClose: () => void;
  onAdd: (fields: PersonFields, relationship: Relationship, relativeId: string, familyId: string) => void;
}

const newFamilyLabels: Partial<Record<Relationship, string>> = {
  parent: 'Create a separate parent family',
  child: 'Create a family with only this parent',
  sibling: 'Create a family with parents unrecorded',
};

export function PersonEditor({ tree, roster, selected, onClose, onAdd }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [relationship, setRelationship] = useState<Relationship>('');
  const [relativeId, setRelativeId] = useState(selected);
  const [familyId, setFamilyId] = useState('');
  const [error, setError] = useState('');
  const relative = tree.people.get(relativeId);
  const families = eligibleFamilies(relationship, relative);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: keyof PersonFields) => String(form.get(name) || '');
    try {
      onAdd({
        given: text('given'),
        surname: text('surname'),
        birthDate: text('birthDate'),
        birthPlace: text('birthPlace'),
        deathDate: text('deathDate'),
        deathPlace: text('deathPlace'),
      }, relationship, relativeId, familyId);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not add this person.');
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="add-title" onCancel={event => { event.preventDefault(); onClose(); }}>
      <form onSubmit={submit}>
        <h2 id="add-title">Add a person</h2>
        <div className="person-fields">
          <label>Given names<input name="given" maxLength={100} autoFocus /></label>
          <label>Surname<input name="surname" maxLength={100} /></label>
          <label>Birth date (optional)<input name="birthDate" placeholder="e.g. 23 MAY 1901" maxLength={90} /></label>
          <label>Birth place (optional)<input name="birthPlace" maxLength={160} /></label>
          <label>Death date (optional)<input name="deathDate" placeholder="e.g. ABT 1970" maxLength={90} /></label>
          <label>Death place (optional)<input name="deathPlace" maxLength={160} /></label>
        </div>
        <fieldset className="relationship-fields">
          <legend>Relationship (optional)</legend>
          <label>New person is a
            <select value={relationship} onChange={event => {
              setRelationship(event.currentTarget.value as Relationship);
              setFamilyId('');
            }}>
              <option value="">No relationship yet</option>
              <option value="parent">Parent of…</option>
              <option value="child">Child of…</option>
              <option value="partner">Partner of…</option>
              <option value="sibling">Sibling of…</option>
            </select>
          </label>
          {relationship && <label>Existing person
            <select required value={relativeId} onChange={event => {
              setRelativeId(event.currentTarget.value);
              setFamilyId('');
            }}>
              {roster.map(person => <option key={person.id} value={person.id}>
                {[person.name, lifespan(person), person.id.replaceAll('@', '')].filter(Boolean).join(' · ')}
              </option>)}
            </select>
          </label>}
          {!!families.length && relative && <label>Family record
            <select required value={familyId} onChange={event => setFamilyId(event.currentTarget.value)}>
              <option value="">Select a family record</option>
              {families.map(family => <option key={family.id} value={family.id}>{familyLabel(tree, family, relative, relationship)}</option>)}
              <option value="new">{newFamilyLabels[relationship]}</option>
            </select>
          </label>}
        </fieldset>
        <p className="form-error" role="alert">{error}</p>
        <div className="form-actions">
          <button className="action" type="button" onClick={onClose}>Cancel</button>
          <button className="action primary" type="submit">Save person</button>
        </div>
      </form>
    </dialog>
  );
}
