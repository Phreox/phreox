import { useSyncExternalStore } from "react";

export const sectionTypes = ["spaces", "chats"] as const;

type SectionType = (typeof sectionTypes)[number];

const initialPath = window.location.pathname.slice(1);

let section: SectionType = isSectionType(initialPath) ? initialPath : "chats";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function isSectionType(value: string): value is SectionType {
  return (sectionTypes as readonly string[]).includes(value);
}

export function setSection(sectionType: SectionType) {
  section = sectionType;
  listeners.forEach((listener) => listener());
}

export function useSection() {
  return useSyncExternalStore(subscribe, () => section);
}
