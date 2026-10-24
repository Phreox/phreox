import { Icon } from "@iconify/react";
import { useRef, useState } from "react";
import { EmojiPicker } from "../EmojiPicker.tsx";
import { GifPicker } from "../GifPicker.tsx";
import { Markdown } from "../Markdown.tsx";
import { Popover } from "../Popover.tsx";
import { FileChip } from "./Files.tsx";
import type { Draft } from "./types.ts";

export function ChatInput({ name, onSend }: {
  name?: string;
  onSend: (draft: Draft) => void;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [gif, setGif] = useState("");
  const [openPanel, setOpenPanel] = useState<"emoji" | "gif">();
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const canSend = text.trim() !== "" || files.length > 0 || gif.trim() !== "";

  function addFiles(list: FileList) {
    setFiles((previous) => [...previous, ...Array.from(list)]);
  }

  function send() {
    if (!canSend) return;

    onSend({ text: text.trim(), files, gif: gif.trim() || undefined });

    setText("");
    setFiles([]);
    setGif("");
    setOpenPanel(undefined);
  }

  return (
    <div
      className="shrink-0 p-4 pt-2 flex flex-col gap-2"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      {text.trim() !== "" && (
        <div className="px-4 py-3 flex flex-col gap-1 bg-(--background-panel) border border-(--border-panel) rounded-xl">
          <p className="text-xs uppercase text-(--text-dark)">Vorschau</p>
          <Markdown source={text} />
        </div>
      )}

      <div
        className={`p-3 flex flex-col gap-2 bg-(--background-dark) border-2 rounded-2xl transition-colors duration-200 ease-in-out ${
          dragging ? "border-(--text-default)" : "border-(--border-surface)"
        }`}
      >
        {gif && (
          <div className="relative w-fit max-w-xs">
            <img src={gif} alt="GIF" className="max-h-40 rounded-md" />

            <button
              type="button"
              className="absolute top-1 right-1 p-1 bg-(--background-darkend) rounded-full cursor-pointer"
              onClick={() => setGif("")}
            >
              <Icon icon="material-symbols:close-rounded" className="w-4 h-4" />
            </button>
          </div>
        )}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <FileChip
                key={index}
                file={file}
                onRemove={() =>
                  setFiles(files.filter((_, fileIndex) => fileIndex !== index))}
              />
            ))}
          </div>
        )}

        <textarea
          rows={1}
          className="w-full field-sizing-content min-h-6 max-h-60 resize-none text-base bg-transparent outline-none text-(--text-default) placeholder:text-(--text-dark)"
          placeholder={dragging
            ? "Datei hier ablegen"
            : `Nachricht an ${name ?? "Unbekannt"}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />

        <div className="flex items-center gap-1 text-(--text-washed)">
          <IconButton
            icon="material-symbols:attach-file-rounded"
            label="Datei anhängen"
            onClick={() => fileInput.current?.click()}
          />

          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <Popover
            open={openPanel === "emoji"}
            onClose={() => setOpenPanel(undefined)}
            trigger={
              <IconButton
                icon="material-symbols:mood-rounded"
                label="Emoji"
                onClick={() =>
                  setOpenPanel(openPanel === "emoji" ? undefined : "emoji")}
              />
            }
          >
            <EmojiPicker onSelect={(emoji) => setText(text + emoji)} />
          </Popover>

          <Popover
            open={openPanel === "gif"}
            onClose={() => setOpenPanel(undefined)}
            trigger={
              <IconButton
                icon="material-symbols:gif-box-rounded"
                label="GIF"
                onClick={() =>
                  setOpenPanel(openPanel === "gif" ? undefined : "gif")}
              />
            }
          >
            <GifPicker
              onSelect={(url) => {
                setGif(url);
                setOpenPanel(undefined);
              }}
            />
          </Popover>

          <div className="flex-1" />

          <IconButton
            icon="material-symbols:send-rounded"
            label="Senden"
            disabled={!canSend}
            onClick={send}
          />
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon, label, disabled, onClick }: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className="p-2 rounded-lg cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-panel) disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
      onClick={onClick}
    >
      <Icon icon={icon} className="w-6 h-6" />
    </button>
  );
}
