import { useEffect, useState } from 'react';
import type { HostedPhoto } from '../lib/hosted-photo-folder';
import type { PhotoMatch } from '../lib/photo-folder';
import type { MediaReference } from '../lib/types';
import { PhotoLightbox } from './photo-lightbox';

function PhotoPreview({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement>();

  if (failed) return <small>Could not display this image.</small>;
  return (
    <>
      <button
        className="photo-thumbnail"
        type="button"
        aria-label={'Enlarge ' + title}
        aria-haspopup="dialog"
        onClick={event => setTrigger(event.currentTarget)}
      >
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
      </button>
      {trigger && <PhotoLightbox url={url} title={title} trigger={trigger} onClose={() => setTrigger(undefined)} />}
    </>
  );
}

function LocalPhotoPreview({ file, title }: { file: File; title: string }) {
  const [preview, setPreview] = useState<{ file: File; url: string }>();

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return preview?.file === file ? <PhotoPreview key={preview.url} url={preview.url} title={title} /> : null;
}

export function ProfilePhotos({ photos, match }: {
  photos: MediaReference[];
  match?: (photo: MediaReference) => PhotoMatch<File | HostedPhoto>;
}) {
  if (!photos.length) return null;
  return (
    <section className="panel profile-photos" aria-labelledby="photos-title">
      <h2 id="photos-title">Photos</h2>
      {!match && <p className="muted">Link a photo folder to see these images.</p>}
      <ul className="photo-list">
        {photos.map(photo => {
          const result = match?.(photo);
          const title = photo.title || photo.path.split(/[/\\]/).pop() || 'Untitled photo';
          return (
            <li className="photo-item" key={photo.id}>
              {result?.status === 'matched' && ('url' in result.file
                ? <PhotoPreview key={result.file.url} url={result.file.url} title={title} />
                : <LocalPhotoPreview file={result.file} title={title} />)}
              <div>{title}</div>
              {result?.status === 'ambiguous' && <small>Multiple files match this title.</small>}
              {result?.status === 'missing' && <small>No matching image in this folder.</small>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
