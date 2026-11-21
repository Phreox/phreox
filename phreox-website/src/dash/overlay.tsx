import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "../i18n.ts";
import { Button } from "./ui.tsx";

/** What lies over the page: dialogs, the panel at the side, questions before something that cannot be undone, and short notes. */

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

let openLayers = 0;

/** What every layer does: Escape closes it, Tab stays inside, the page behind does not scroll, the focus goes back where it was. */
export function useLayer(onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);

  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const node = panel.current;

    openLayers += 1;
    document.documentElement.style.overflow = "hidden";
    (node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node)?.focus();

    function onKey(event: KeyboardEvent) {
      // Only the layer on top answers.
      if (!node || node.closest("[data-layer]")?.nextElementSibling?.matches("[data-layer]")) return;

      if (event.key === "Escape") {
        event.stopPropagation();
        close.current();
      }

      if (event.key === "Tab") {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null);
        const first = items[0];
        const last = items[items.length - 1];

        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      openLayers -= 1;

      if (openLayers === 0) document.documentElement.style.overflow = "";

      before?.focus?.();
    };
  }, []);

  return panel;
}

const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-6xl" } as const;

/** A dialog in the middle of the page. `footer` holds its buttons, the one that goes on at the right. */
export function Dialog({ title, description, onClose, children, footer, size = "md" }: { title: string; description?: ReactNode; onClose: () => void; children?: ReactNode; footer?: ReactNode; size?: keyof typeof widths }) {
  const { t } = useT();
  const panel = useLayer(onClose);

  return createPortal(
    <div data-layer className="dash dash-layer fixed inset-0 z-[80] grid place-items-center overflow-y-auto p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`dash-dialog flex max-h-[calc(100dvh-1.5rem)] w-full ${widths[size]} flex-col rounded-2xl border border-(--border-panel) bg-(--background-surface) shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] outline-none sm:max-h-[calc(100dvh-3rem)]`}>
        <header className="flex items-start gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 className="display text-[1.6rem] leading-none">{title}</h2>
            {description && <p className="mt-2 text-sm text-(--text-washed)">{description}</p>}
          </div>
          <button type="button" aria-label={t("common.close")} className="-mt-1 -mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-(--text-dark) transition-colors hover:bg-(--background-raised) hover:text-white" onClick={onClose}>
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        {children !== undefined && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>}
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-(--border-surface) px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** A panel that comes in from the right, for the details of one thing while the list stays behind it. */
export function Drawer({ title, subtitle, onClose, children, lead }: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; lead?: ReactNode }) {
  const { t } = useT();
  const panel = useLayer(onClose);

  return createPortal(
    <div data-layer className="dash dash-layer fixed inset-0 z-[80] flex justify-end" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="dash-drawer flex h-full w-full max-w-[46rem] flex-col border-l border-(--border-panel) bg-(--background-surface) shadow-[-30px_0_80px_-30px_rgb(0_0_0/0.8)] outline-none">
        <header className="flex items-center gap-3 border-b border-(--border-surface) px-5 py-4">
          {lead}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-(--text-dark)">{subtitle}</div>}
          </div>
          <button type="button" aria-label={t("common.close")} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-(--text-dark) transition-colors hover:bg-(--background-raised) hover:text-white" onClick={onClose}>
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ---- questions and notes --------------------------------------------------------------------------------------------

type Question = { title: string; text?: ReactNode; confirm: string; danger?: boolean };
type Note = { id: number; text: string; tone: "ok" | "fail" };

type Overlays = {
  /** Asks before something that cannot be taken back. Resolves to whether it was confirmed. */
  ask: (question: Question) => Promise<boolean>;
  /** A short note at the edge of the page that goes away by itself. */
  note: (text: string, tone?: Note["tone"]) => void;
};

const OverlayContext = createContext<Overlays>({ ask: async () => false, note: () => undefined });

export function useOverlays() {
  return useContext(OverlayContext);
}

const NOTE_MILLIS = 4_500;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [question, setQuestion] = useState<Question & { answer: (yes: boolean) => void }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const nextId = useRef(1);

  const ask = useCallback((asked: Question) => new Promise<boolean>((resolve) => setQuestion({ ...asked, answer: resolve })), []);
  const note = useCallback((text: string, tone: Note["tone"] = "ok") => {
    const id = nextId.current++;

    setNotes((list) => [...list.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setNotes((list) => list.filter((entry) => entry.id !== id)), NOTE_MILLIS);
  }, []);
  const value = useMemo(() => ({ ask, note }), [ask, note]);

  function answer(yes: boolean) {
    question?.answer(yes);
    setQuestion(undefined);
  }

  return (
    <OverlayContext.Provider value={value}>
      {children}

      {question && (
        <Dialog size="sm" title={question.title} description={question.text} onClose={() => answer(false)} footer={<>
          <Button kind="ghost" onClick={() => answer(false)}>{t("common.cancel")}</Button>
          <Button kind={question.danger ? "danger-solid" : "primary"} autoFocus onClick={() => answer(true)}>{question.confirm}</Button>
        </>} />
      )}

      {createPortal(
        <div className="dash pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
          {notes.map((entry) => (
            <div key={entry.id} role={entry.tone === "fail" ? "alert" : "status"} className={`dash-note pointer-events-auto flex items-start gap-3 rounded-xl border bg-(--background-panel) px-4 py-3 text-sm shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)] ${entry.tone === "fail" ? "border-[#ee0333]/50" : "border-(--border-panel)"}`}>
              <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${entry.tone === "fail" ? "bg-[#ff7a93]" : "bg-[#3ecf8e]"}`} />
              <p className="min-w-0 flex-1 break-words">{entry.text}</p>
              <button type="button" aria-label={t("common.close")} className="cursor-pointer text-(--text-dark) hover:text-white" onClick={() => setNotes((list) => list.filter((item) => item.id !== entry.id))}>×</button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </OverlayContext.Provider>
  );
}

/**
 * Runs what a button starts: while it runs `busy` is true, a failure is told in a note, and so is `done` when it worked.
 * Returns whether it worked.
 */
export function useRun() {
  const { note } = useOverlays();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true);

    try {
      await action();

      if (done) note(done);

      return true;
    } catch (failure) {
      note(failure instanceof Error ? failure.message : String(failure), "fail");

      return false;
    } finally {
      setBusy(false);
    }
  }, [note]);

  return { busy, run };
}

// ---- the code of the second factor ------------------------------------------------------------------------------------

const CODE_LENGTH = 6;

/** Six boxes, one per digit, over one field: typing, pasting and the code the phone offers all go into it. */
export function CodeInput({ value, onChange, onComplete, autoFocus }: { value: string; onChange: (code: string) => void; onComplete?: (code: string) => void; autoFocus?: boolean }) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative mx-auto w-fit">
      <div aria-hidden className="flex gap-2">
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const active = focused && index === Math.min(value.length, CODE_LENGTH - 1);

          return (
            <span key={index} className={`grid h-14 w-11 place-items-center rounded-xl border bg-(--background-dark) text-2xl font-semibold tabular-nums transition-colors ${active ? "border-(--brand) shadow-[0_0_0_3px_rgb(131_90_252/0.25)]" : value[index] ? "border-(--border-raised)" : "border-(--border-surface)"} ${index === 3 ? "ml-3" : ""}`}>
              {value[index] ?? ""}
            </span>
          );
        })}
      </div>
      <input
        data-autofocus={autoFocus ? "" : undefined}
        autoFocus={autoFocus}
        aria-label="Code"
        className="absolute inset-0 cursor-text opacity-0"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const code = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);

          onChange(code);

          if (code.length === CODE_LENGTH) onComplete?.(code);
        }}
      />
    </div>
  );
}
