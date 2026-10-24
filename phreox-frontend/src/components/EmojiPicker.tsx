import { useState } from "react";
import { Emoji } from "./Emoji.tsx";
import { emojiGroups } from "../data/emojis.ts";

const groupIcons: Record<string, string> = {
  "Smileys & Emotion": "😀",
  "People & Body": "👋",
  "Component": "🏻",
  "Animals & Nature": "🐶",
  "Food & Drink": "🍕",
  "Travel & Places": "✈️",
  "Activities": "⚽",
  "Objects": "💡",
  "Symbols": "❤️",
  "Flags": "🏁",
};

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeGroup, setActiveGroup] = useState(emojiGroups[0].name);
  const group = emojiGroups.find((item) => item.name === activeGroup) ??
    emojiGroups[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1 pb-2 border-b border-(--border-panel)">
        {emojiGroups.map((item) => (
          <button
            key={item.name}
            type="button"
            title={item.name}
            aria-label={item.name}
            className={`p-1 text-lg leading-none cursor-pointer rounded-md transition-colors duration-200 ease-in-out ${
              item.name === group.name
                ? "bg-(--background-raised)"
                : "hover:bg-(--background-panel)"
            }`}
            onClick={() => setActiveGroup(item.name)}
          >
            <Emoji emoji={groupIcons[item.name] ?? item.subgroups[0].emojis[0]} />
          </button>
        ))}
      </div>

      <div className="max-h-72 overflow-y-auto flex flex-col gap-3">
        {group.subgroups.map((subgroup) => (
          <div key={subgroup.name} className="flex flex-col gap-1">
            <p className="text-xs uppercase text-(--text-dark)">
              {subgroup.name.replace(/-/g, " ")}
            </p>

            <div className="grid grid-cols-8 gap-1">
              {subgroup.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="p-1 text-2xl leading-none cursor-pointer rounded-md transition-colors duration-200 ease-in-out hover:bg-(--background-raised)"
                  onClick={() => onSelect(emoji)}
                >
                  <Emoji emoji={emoji} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
