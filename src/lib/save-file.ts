import { gedcomForExport } from './gedcom';
import type { TreeDocument } from './types';

interface GedcomHandle {
  name: string;
  createWritable(): Promise<WritableStream & { write(data: Blob): Promise<void> }>;
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<GedcomHandle>;
};

export function exportFilename(filename: string) {
  return filename.replace(/(?:\.ged(?:com)?(?:\.txt)?|\.txt)$/i, '') + '-updated.ged';
}

function download(file: Blob, filename: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function saveGedcomFile(draft: TreeDocument) {
  const file = new Blob([gedcomForExport(draft.raw)], { type: 'text/plain;charset=utf-8' });
  const filename = exportFilename(draft.filename);
  const pickerWindow = window as PickerWindow;
  if (!pickerWindow.showSaveFilePicker) {
    download(file, filename);
    return 'GEDCOM download started.';
  }
  let handle: GedcomHandle;
  try {
    handle = await pickerWindow.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'GEDCOM family tree', accept: { 'text/plain': ['.ged'] } }],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    download(file, filename);
    return 'GEDCOM download started.';
  }
  let writer: Awaited<ReturnType<GedcomHandle['createWritable']>> | undefined;
  try {
    writer = await handle.createWritable();
    await writer.write(file);
    await writer.close();
    return 'Saved ' + handle.name + '.';
  } catch {
    if (writer) await writer.abort().catch(() => {});
    download(file, filename);
    return 'Could not write to the chosen location. GEDCOM download started instead.';
  }
}
