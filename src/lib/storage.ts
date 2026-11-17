import type { TreeDocument } from './types';

// Preserve the browser drafts made by the previous Family Atlas app on the same origin.
export const STORAGE_KEY = 'family-atlas.current-tree.v1';

export function readDraft(serialized: string): TreeDocument {
  const draft = JSON.parse(serialized) as Partial<TreeDocument> | null;
  if (!draft || typeof draft.raw !== 'string' || typeof draft.filename !== 'string') {
    throw new Error('Invalid saved tree.');
  }
  return {
    raw: draft.raw,
    filename: draft.filename,
    initialId: typeof draft.initialId === 'string' ? draft.initialId : undefined,
    initialTitle: typeof draft.initialTitle === 'string' ? draft.initialTitle : undefined,
    edited: draft.edited === true,
  };
}

export function writeDraft(storage: Pick<Storage, 'getItem' | 'setItem'>, previous: string | null, draft: TreeDocument) {
  if (storage.getItem(STORAGE_KEY) !== previous) {
    return { serialized: previous, status: 'Another tab saved a different tree. Use Save GEDCOM to keep this version.' };
  }
  const serialized = JSON.stringify(draft);
  storage.setItem(STORAGE_KEY, serialized);
  return { serialized, status: 'Saved in this browser.' };
}
