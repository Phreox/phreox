import { useSyncExternalStore } from "react";

export const sectionTypes = ["social", "spaces"] as const;

type SectionType = (typeof sectionTypes)[number];

export function sectionFromPath(pathname: string) {
  return pathname.split("/")[1] ?? "";
}

const initialSection = sectionFromPath(window.location.pathname);

let section: SectionType = isSectionType(initialSection)
  ? initialSection
  : "social";
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
