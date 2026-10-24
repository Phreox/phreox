import { type ReactNode, useEffect, useRef } from "react";

export function Popover({ open, onClose, trigger, children }: {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      {trigger}

      {open && (
        <div className="absolute bottom-full left-0 mb-3 z-20 w-96 p-2 bg-(--background-surface) border border-(--border-panel) rounded-xl shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}
