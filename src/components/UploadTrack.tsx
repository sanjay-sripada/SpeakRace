"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  estimateTargetWpm,
  MAX_RACE_WORDS,
  prepareRaceText,
  saveCustomPassage,
} from "@/lib/customPassage";
import {
  acceptedFileLabel,
  extractTextFromFile,
  isAcceptedFile,
} from "@/lib/extractText";

export function UploadTrack() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    text: string;
    sourceName: string;
    truncated: boolean;
    wordCount: number;
    targetWpm: number;
  } | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [title, setTitle] = useState("My Upload");

  const buildPreview = useCallback((raw: string, sourceName: string, preferredTitle?: string) => {
    const prepared = prepareRaceText(raw);
    if (!prepared.text || prepared.wordCount < 3) {
      throw new Error("Need at least a few words to start a race.");
    }
    const baseTitle =
      preferredTitle ||
      sourceName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() ||
      "My Upload";
    setTitle(baseTitle);
    setPreview({
      title: baseTitle,
      text: prepared.text,
      sourceName,
      truncated: prepared.truncated,
      wordCount: prepared.wordCount,
      targetWpm: estimateTargetWpm(
        Math.min(prepared.wordCount, MAX_RACE_WORDS),
      ),
    });
    setError(null);
  }, []);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      if (!isAcceptedFile(file)) {
        setError(`Unsupported type. Use ${acceptedFileLabel()}.`);
        return;
      }
      setBusy(true);
      setError(null);
      setPasteMode(false);
      try {
        const text = await extractTextFromFile(file);
        buildPreview(text, file.name);
      } catch (e) {
        setPreview(null);
        setError(e instanceof Error ? e.message : "Failed to read file.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [buildPreview],
  );

  const startRace = () => {
    if (!preview) return;
    saveCustomPassage({
      title: title.trim() || preview.title,
      text: preview.text,
      targetWpm: preview.targetWpm,
      sourceName: preview.sourceName,
      truncated: preview.truncated,
      wordCount: preview.wordCount,
    });
    router.push("/race?passage=custom");
  };

  const applyPaste = () => {
    try {
      buildPreview(pasteText, "pasted text", title.trim() || "Pasted text");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use that text.");
    }
  };

  return (
    <section className="rounded-2xl bg-[#14181f] p-5 ring-1 ring-white/10 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300/90">
            Your material
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-wide text-white">
            Upload &amp; race
          </h3>
          <p className="mt-2 max-w-md text-sm text-white/50">
            Drop a resume, speech, story, or notes. We&apos;ll turn it into a
            Reading Race ({MAX_RACE_WORDS} words max per run).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPasteMode((v) => !v);
            setError(null);
          }}
          className="text-sm font-medium text-amber-300/90 transition hover:text-amber-200"
        >
          {pasteMode ? "Upload a file instead" : "Or paste text"}
        </button>
      </div>

      {!pasteMode ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 transition ${
            dragOver
              ? "border-amber-300 bg-amber-300/10"
              : "border-white/15 bg-white/[0.03] hover:border-white/30"
          }`}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.markdown,.pdf,.csv,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <p className="text-sm font-medium text-white/80">
            {busy ? "Reading your file…" : "Drop a file here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-white/40">{acceptedFileLabel()}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder="Paste an email, speech, or paragraph to practice…"
            className="w-full resize-y rounded-xl border border-white/10 bg-[#0c0f14] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/40"
          />
          <button
            type="button"
            onClick={applyPaste}
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Preview text
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/30">
          {error}
        </p>
      )}

      {preview && (
        <div className="mt-5 space-y-4 rounded-xl bg-[#0c0f14] p-4 ring-1 ring-white/10">
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-white/45">
              Race title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#14181f] px-3 py-2 text-sm text-white outline-none focus:border-amber-300/40"
              />
            </label>
            <label className="flex w-28 flex-col gap-1 text-xs text-white/45">
              Target WPM
              <input
                type="number"
                min={80}
                max={180}
                value={preview.targetWpm}
                onChange={(e) =>
                  setPreview({
                    ...preview,
                    targetWpm: Math.max(
                      80,
                      Math.min(180, Number(e.target.value) || 120),
                    ),
                  })
                }
                className="rounded-lg border border-white/10 bg-[#14181f] px-3 py-2 text-sm text-white outline-none focus:border-amber-300/40"
              />
            </label>
          </div>

          <p className="text-xs text-white/40">
            {Math.min(preview.wordCount, MAX_RACE_WORDS)} words ready
            {preview.truncated
              ? ` · truncated from ${preview.wordCount} words (first ${MAX_RACE_WORDS})`
              : ""}
            {" · "}
            from {preview.sourceName}
          </p>

          <p className="line-clamp-4 text-sm leading-relaxed text-white/70">
            {preview.text}
          </p>

          <button
            type="button"
            onClick={startRace}
            className="rounded-full bg-amber-300 px-7 py-3 text-sm font-bold uppercase tracking-wider text-[#14181f] transition hover:bg-amber-200"
          >
            Start Race with This File
          </button>
        </div>
      )}
    </section>
  );
}
