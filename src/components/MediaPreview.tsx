import { Lock, PlayCircle } from "lucide-react";

function getMediaExtension(value: string) {
  let decodedValue = value.split("?")[0] ?? value;
  try {
    decodedValue = decodeURIComponent(decodedValue);
  } catch {
    decodedValue = value;
  }

  const cleanValue = decodedValue.split("#")[0].trim().toLowerCase();
  const match = cleanValue.match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function MediaPreview({
  url,
  title,
  blobName,
}: {
  url: string;
  title: string;
  blobName?: string;
}) {
  const extension =
    getMediaExtension(blobName ?? "") ||
    getMediaExtension(title) ||
    getMediaExtension(url);
  const isImage = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "avif",
    "bmp",
    "svg",
  ].includes(extension);
  const isVideo = ["mp4", "webm", "mov", "m4v", "ogv"].includes(extension);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension);
  const isPdf = extension === "pdf";

  return (
    <div className="media-preview">
      {isImage ? <img src={url} alt={title} loading="lazy" /> : null}
      {isVideo ? <video src={url} controls playsInline preload="metadata" /> : null}
      {isAudio ? <audio src={url} controls preload="metadata" /> : null}
      {isPdf ? <iframe src={url} title={title} /> : null}
      {!isImage && !isVideo && !isAudio && !isPdf ? (
        <div>
          <PlayCircle size={42} />
          <strong>Preview not available</strong>
          <span>Download the blob or open it in a new tab.</span>
        </div>
      ) : null}
    </div>
  );
}

export function LockedMediaPreview({ accessMode }: { accessMode: string }) {
  return (
    <div className="media-preview locked-preview">
      <div>
        <Lock size={42} />
        <strong>Access controlled media</strong>
        <span>
          {`This ${accessMode} asset opens after Payby verifies the on-chain access policy.`}
        </span>
      </div>
    </div>
  );
}
