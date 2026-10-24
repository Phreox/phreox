import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return "material-symbols:image-rounded";
  if (file.type.startsWith("video/")) return "material-symbols:movie-rounded";
  if (file.type.startsWith("audio/")) {
    return "material-symbols:audio-file-rounded";
  }
  if (file.type === "application/pdf") {
    return "material-symbols:picture-as-pdf-rounded";
  }
  if (/\.(zip|rar|7z|tar|gz)$/i.test(file.name)) {
    return "material-symbols:folder-zip-rounded";
  }
  if (/\.(js|ts|tsx|jsx|json|html|css|py|rs|go|java|c|cpp|sh)$/i.test(file.name)) {
    return "material-symbols:code-rounded";
  }

  return "material-symbols:description-rounded";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;

  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function FileChip({ file, onRemove }: {
  file: File;
  onRemove?: () => void;
}) {
  return (
    <div className="max-w-xs px-3 py-2 flex items-center gap-2 text-sm text-(--text-washed) bg-(--background-panel) border border-(--border-panel) rounded-xl">
      <Icon icon={getFileIcon(file)} className="shrink-0 w-5 h-5" />

      <div className="min-w-0 flex flex-col">
        <span className="truncate">{file.name}</span>
        <span className="text-xs text-(--text-dark)">
          {formatSize(file.size)}
        </span>
      </div>

      {onRemove && (
        <button
          type="button"
          className="shrink-0 cursor-pointer"
          onClick={onRemove}
        >
          <Icon icon="material-symbols:close-rounded" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function MessageFile({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (previewUrl) {
    return (
      <img src={previewUrl} alt={file.name} className="max-w-xs rounded-md" />
    );
  }

  return <FileChip file={file} />;
}
