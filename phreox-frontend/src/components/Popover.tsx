import { type ReactNode, useEffect, useRef } from "react";

export function Popover({
  open,
  onClose,
  trigger,
  children,
  align = "left",
  panelClassName = "w-96",
}: {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
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
        <div className={`absolute bottom-full mb-3 z-20 ${align === "right" ? "right-0" : "left-0"} ${panelClassName} p-2 bg-(--background-surface) border border-(--border-panel) rounded-xl shadow-lg animate-fade-in`}>
          {children}
        </div>
      )}
    </div>
  );
}
