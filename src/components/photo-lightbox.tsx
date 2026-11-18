import { useEffect, useId, useRef } from 'react';

export function PhotoLightbox({ url, title, trigger, onClose }: {
  url: string;
  title: string;
  trigger: HTMLButtonElement;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger.isConnected) trigger.focus();
    };
  }, [trigger]);

  return (
    <dialog
      ref={dialog}
      className="photo-lightbox"
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="photo-lightbox-frame">
        <div className="photo-lightbox-header">
          <h2 id={titleId}>{title}</h2>
          <button className="action" type="button" onClick={onClose}>Close</button>
        </div>
        <img src={url} alt={title} />
      </div>
    </dialog>
  );
}
