'use client';

import { useEffect, useRef, useState } from 'react';
import { sampleDocument } from '../data/sample';
import { addPerson } from '../lib/add-person';
import { decodeGedcom, parseGedcom } from '../lib/gedcom';
import { eligibleFamilies } from '../lib/relationships';
import { saveGedcomFile } from '../lib/save-file';
import { readDraft, STORAGE_KEY, writeDraft } from '../lib/storage';
import type { PersonFields, Relationship, Tree, TreeDocument, TreeView } from '../lib/types';

interface OpenTree {
  draft: TreeDocument;
  tree: Tree;
}

const sampleTree: OpenTree = { draft: sampleDocument, tree: parseGedcom(sampleDocument.raw) };

export function useFamilyTree() {
  const [openTree, setOpenTree] = useState(sampleTree);
  const [selected, setSelected] = useState(sampleDocument.initialId!);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<TreeView>('family');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const current = useRef(openTree);
  const lastSaved = useRef<string | null>(null);
  const importSequence = useRef(0);

  function open(next: OpenTree) {
    current.current = next;
    setOpenTree(next);
    const { initialId } = next.draft;
    setSelected(initialId && next.tree.people.has(initialId) ? initialId : next.tree.people.keys().next().value!);
    setSearch('');
    setView('family');
  }

  useEffect(() => {
    try {
      lastSaved.current = window.localStorage.getItem(STORAGE_KEY);
      if (lastSaved.current) {
        const draft = readDraft(lastSaved.current);
        open({ draft, tree: parseGedcom(draft.raw) });
      }
    } catch {
      setStatus('The browser could not restore a saved tree. You can open a GEDCOM file to continue.');
    }
  }, []);

  function persist(draft: TreeDocument) {
    try {
      const saved = writeDraft(window.localStorage, lastSaved.current, draft);
      lastSaved.current = saved.serialized;
      return saved.status;
    } catch {
      return 'Browser storage is unavailable or full. Use Save GEDCOM to keep this tree.';
    }
  }

  async function importFile(file: File) {
    const sequence = ++importSequence.current;
    setStatus('Opening ' + file.name + '…');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (sequence !== importSequence.current) return;
      const raw = decodeGedcom(bytes);
      const tree = parseGedcom(raw);
      if (current.current.draft.edited && !window.confirm(
        'Opening another file will replace this browser’s current tree. Use Save GEDCOM first if you want a copy of your additions. Open the new file?',
      )) {
        setStatus('Kept your current tree.');
        return;
      }
      const draft = { raw, filename: file.name, edited: false };
      open({ draft, tree });
      setStatus('Opened ' + file.name + '. ' + persist(draft));
    } catch (error) {
      if (sequence === importSequence.current) {
        setStatus('Could not open ' + file.name + '. ' + (error instanceof Error ? error.message : 'Try another GEDCOM file.'));
      }
    }
  }

  function createPerson(fields: PersonFields, relationship: Relationship, relativeId: string, familyId: string) {
    const { draft, tree } = current.current;
    const relative = tree.people.get(relativeId);
    const families = eligibleFamilies(relationship, relative);
    const family = families.find(candidate => candidate.id === familyId);
    if (families.length && !family && familyId !== 'new') throw new Error('Choose a family record.');
    const result = addPerson(draft.raw, fields, relationship, relative, family);
    const updatedTree = parseGedcom(result.raw);
    const updatedDraft = { ...draft, raw: result.raw, initialId: result.personId, edited: true };
    open({ draft: updatedDraft, tree: updatedTree });
    setStatus('Added ' + updatedTree.people.get(result.personId)!.name + '. ' + persist(updatedDraft));
  }

  async function saveFile() {
    const snapshot = current.current;
    setSaving(true);
    try {
      const result = await saveGedcomFile(snapshot.draft);
      if (!result) {
        setStatus('GEDCOM save canceled.');
      } else if (snapshot !== current.current) {
        setStatus(result + ' Your current tree has changed since you started saving.');
      } else {
        setStatus(result);
        if (snapshot.draft.edited) {
          const draft = { ...snapshot.draft, edited: false };
          const next = { ...snapshot, draft };
          current.current = next;
          setOpenTree(next);
          persist(draft);
        }
      }
    } catch {
      setStatus('Could not save a GEDCOM file. Check your browser’s download permissions and try again.');
    } finally {
      setSaving(false);
    }
  }

  return {
    ...openTree, selected, setSelected, search, setSearch, view, setView, status,
    saving, importFile, createPerson, saveFile,
  };
}
