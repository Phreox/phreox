import { Icon } from "@iconify/react";
import { Avatar } from "../Avatar.tsx";

export function ChatTopBar(
  { name, seed, color, src, status, onToggleSidePanel }: {
    name?: string;
    seed: string;
    color?: string;
    src?: string | null;
    status?: string;
    onToggleSidePanel: () => void;
  },
) {
  return (
    <div className="px-4 py-2 flex justify-between items-center gap-4 border-b-2 border-b-(--background-panel)">
      <div className="min-w-0 flex items-center gap-2">
        <Avatar
          name={name ?? "?"}
          seed={seed}
          color={color}
          src={src}
          status={status}
        />

        <p className="truncate">{name ?? "Deleted user"}</p>
      </div>

      <div className="shrink-0 flex items-center gap-3 text-(--text-washed)">
        <Icon
          icon="material-symbols:call-rounded"
          className="w-5 h-5 cursor-pointer"
        />
        <Icon
          icon="material-symbols:videocam-rounded"
          className="w-5 h-5 cursor-pointer"
        />
        <Icon
          icon="material-symbols:keep-rounded"
          className="w-5 h-5 cursor-pointer"
        />
        <button
          type="button"
          title="Infos anzeigen"
          aria-label="Infos anzeigen"
          className="cursor-pointer"
          onClick={onToggleSidePanel}
        >
          <Icon icon="material-symbols:group-rounded" className="w-5 h-5" />
        </button>

        <div className="w-60 px-2 py-1 flex items-center gap-1 bg-(--background-dark) border border-(--border-surface) rounded-md">
          <input
            className="min-w-0 flex-1 text-sm outline-none"
            placeholder={`${name ?? "Unbekannt"} suchen`}
          />

          <Icon
            icon="material-symbols:search-rounded"
            className="shrink-0 w-4 h-4"
          />
        </div>
      </div>
    </div>
  );
}
