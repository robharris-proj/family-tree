import { useState } from 'react';

interface ImportProps {
  onOpen: (file: File) => void;
}

export function SiteHeader({ onOpen }: ImportProps) {
  return (
    <header>
      <div className="top">
        <div className="brand"><span className="mark" aria-hidden="true">✳</span>Family Tree</div>
        <div className="file-open">
          <label htmlFor="gedcom-file">Open GEDCOM</label>
          <input
            id="gedcom-file"
            type="file"
            aria-describedby="file-help"
            onChange={event => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) onOpen(file);
            }}
          />
        </div>
      </div>
    </header>
  );
}

export function GedcomDropZone({ onOpen, status }: ImportProps & { status: string }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={dragging ? 'drop-zone dragging' : 'drop-zone'}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={event => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onOpen(file);
      }}
    >
      <p id="file-help">Choose a GEDCOM file above or drop it here.</p>
      <p id="status" role="status">{status}</p>
    </div>
  );
}
