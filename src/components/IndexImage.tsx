import { useState } from 'react';
import { mediaIdentity, mediaUrl } from '../modules/indexesApi';

const fallback = '/DefaultImage.jpg';

export function IndexImage({ url, name, className }: { url: string | null; name: string; className: string }) {
  const src = url ? mediaUrl(url) : null;
  return <Cover key={src ? mediaIdentity(src) : fallback} src={src ?? fallback} name={name} className={className} />;
}

function Cover({ src, name, className }: { src: string; name: string; className: string }) {
  const [displayUrl, setDisplayUrl] = useState(src);
  return (
    <img
      src={displayUrl}
      alt={name}
      className={className}
      onError={() => setDisplayUrl(fallback)}
    />
  );
}
