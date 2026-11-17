'use client';

import { useMemo, useState } from 'react';
import { useFamilyTree } from '../hooks/use-family-tree';
import { FamilyTree } from './family-tree';
import { GedcomDropZone, SiteHeader } from './gedcom-import';
import { PeopleDirectory } from './people-directory';
import { PersonEditor } from './person-editor';
import { PersonProfile } from './person-profile';

export function FamilyAtlas() {
  const state = useFamilyTree();
  const { draft, tree, selected, setSelected } = state;
  const [editing, setEditing] = useState(false);
  const roster = useMemo(() => [...tree.people.values()].sort((a, b) =>
    (a.surname || a.name).localeCompare(b.surname || b.name) || a.name.localeCompare(b.name)
  ), [tree]);
  const person = tree.people.get(selected) ?? roster[0];

  return (
    <>
      <SiteHeader onOpen={state.importFile} />
      <main>
        <section className="hero">
          <div>
            <div className="label">Family tree</div>
            <h1>{draft.initialTitle || 'Family tree'}</h1>
            <p className="muted">{draft.filename}</p>
          </div>
          <div className="stats">
            <div><strong>{tree.people.size}</strong><span>People</span></div>
            <div><strong>{tree.families.length}</strong><span>Family records</span></div>
          </div>
        </section>
        <GedcomDropZone status={state.status} onOpen={state.importFile} />
        <div className="layout">
          <PeopleDirectory
            roster={roster}
            selected={person.id}
            search={state.search}
            saving={state.saving}
            onSelect={setSelected}
            onSearch={state.setSearch}
            onAdd={() => setEditing(true)}
            onSave={state.saveFile}
          />
          <FamilyTree tree={tree} person={person} onSelect={setSelected} view={state.view} onView={state.setView} />
          <PersonProfile tree={tree} person={person} onSelect={setSelected} />
        </div>
        <footer>Files and additions stay in this browser. Use Save GEDCOM to save a copy you can move or share.</footer>
      </main>
      {editing && <PersonEditor tree={tree} roster={roster} selected={person.id} onClose={() => setEditing(false)} onAdd={state.createPerson} />}
    </>
  );
}
