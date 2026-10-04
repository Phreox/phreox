import { Icon } from "@iconify/react";

export function Header() {
  return (
    <div className="w-full h-14 flex pt-4">
      <div className="flex-1"></div>

      <div className="px-4 py-2 w-120 h-full flex justify-between items-center gap-2 bg-(--background-dark) rounded-xl text-(--text-washed) text-sm">
        <div className="flex gap-2 items-center">
          <Icon icon="mdi:search" className="w-5 h-5" />

          <p>Channel, person, talk, message or command</p>
        </div>

        <div className="px-1 py-0.5 flex gap-1 bg-(--background-surface) rounded-md">
          Strg + K
        </div>
      </div>

      <div className="flex-1"></div>
    </div>
  );
}
