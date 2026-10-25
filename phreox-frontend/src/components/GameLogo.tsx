import { useState } from "react";

const fallbackColors = [
  "#8c7a9e",
  "#9aa88a",
  "#8a9bab",
  "#b08f8a",
  "#7f9e96",
  "#a39a7e",
];

const sizes = {
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-xl",
};

/**
 * A square game or app logo. Shows the image cropped to 1:1 when there is
 * one. Otherwise a colored tile with the initials of the name.
 */
export function GameLogo({ name, src, size = "md" }: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const shape = `${sizes[size]} shrink-0 aspect-square rounded-lg`;

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={name}
        className={`${shape} object-cover`}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      role="img"
      aria-label={name}
      className={`${shape} flex items-center justify-center font-semibold text-(--background-darkend)`}
      style={{ backgroundColor: fallbackColors[hash % fallbackColors.length] }}
    >
      {initials}
    </div>
  );
}
