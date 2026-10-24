import { Icon } from "@iconify/react";
import { statusStateData } from "../data/status.ts";

const fallbackColors = [
  "#8c7a9e",
  "#9aa88a",
  "#8a9bab",
  "#b08f8a",
  "#7f9e96",
  "#a39a7e",
];

const sizes = {
  md: {
    shape: "w-10 h-10 border-2",
    badge: "-bottom-0.5 -right-0.5 w-4 h-4 border-2",
    icon: "w-3 h-3",
  },
  lg: {
    shape: "w-16 h-16 border-4",
    badge: "-bottom-1 -right-1 w-6 h-6 border-4",
    icon: "w-4 h-4",
  },
};

export function Avatar(
  { name, seed, color, src, status, size = "md" }: {
    name: string;
    seed: string;
    color?: string;
    src?: string | null;
    status?: string;
    size?: keyof typeof sizes;
  },
) {
  const statusData = statusStateData.find((data) => data.label === status);
  const shape =
    `${sizes[size].shape} border-(--background-surface) rounded-full`;

  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return (
    <div className="relative shrink-0">
      {src
        ? <img src={src} alt={name} className={`${shape} object-cover`} />
        : (
          <div
            className={`flex justify-center items-center ${shape}`}
            style={{
              backgroundColor: color ??
                fallbackColors[hash % fallbackColors.length],
            }}
          >
            {name[0]}
          </div>
        )}

      {statusData && (
        <div
          className={`absolute ${sizes[size].badge} flex justify-center items-center rounded-full bg-(--background-darkend) border-(--background-surface)`}
        >
          <Icon
            icon={statusData.icon}
            style={{ color: statusData.color }}
            className={sizes[size].icon}
          />
        </div>
      )}
    </div>
  );
}
