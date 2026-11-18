const folderInputAttributes = { webkitdirectory: '' };

export function PhotoFolderPicker({
  folder, busy, status, canChooseDirectory, reconnectName,
  chooseDirectory, onSelect, reconnect, onClear,
}: {
  folder: { name: string; imageCount: number } | null;
  busy: boolean;
  status: string;
  canChooseDirectory: boolean;
  reconnectName?: string;
  chooseDirectory: () => void;
  onSelect: (files: File[]) => void;
  reconnect: () => void;
  onClear: () => void;
}) {
  const linked = Boolean(folder || reconnectName);
  const actionLabel = linked ? 'Change photo folder' : 'Link photo folder';
  const description = folder
    ? folder.name + ' · ' + (folder.imageCount === 1 ? '1 image available' : folder.imageCount + ' images available')
    : reconnectName ? 'Reconnect ' + reconnectName + ' to see its photos.' : 'Match your local images to titles in the GEDCOM.';
  const notice = status || (folder && reconnectName ? 'Showing saved photos. Reconnect to read changes from the folder.' : '');

  return (
    <section className="photo-folder" aria-label="Photo folder" aria-busy={busy}>
      <div className="photo-folder-actions">
        {reconnectName && <button className="action" type="button" onClick={reconnect} disabled={busy}>Reconnect photo folder</button>}
        {canChooseDirectory ? (
          <button className="action" type="button" onClick={chooseDirectory} disabled={busy}>{actionLabel}</button>
        ) : (
          <label className="action photo-folder-choose">
            {actionLabel}
            <input
              {...folderInputAttributes}
              type="file"
              multiple
              disabled={busy}
              onChange={event => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = '';
                onSelect(files);
              }}
            />
          </label>
        )}
        {linked && <button className="action" type="button" onClick={onClear} disabled={busy}>Unlink folder</button>}
      </div>
      <p className="muted" role="status">
        {description}
        {notice && <small>{notice}</small>}
      </p>
    </section>
  );
}
