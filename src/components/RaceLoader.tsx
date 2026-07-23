"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RaceScreen } from "@/components/RaceScreen";
import {
  customPayloadToPassage,
  loadCustomPassage,
  type CustomPassagePayload,
} from "@/lib/customPassage";
import { getPassage, PASSAGES } from "@/lib/passages";
import type { Passage } from "@/lib/types";

type RaceLoaderProps = {
  passageId: string;
};

export function RaceLoader({ passageId }: RaceLoaderProps) {
  const [passage, setPassage] = useState<Passage | null>(() =>
    passageId === "custom" ? null : getPassage(passageId) ?? null,
  );
  const [customMeta, setCustomMeta] = useState<CustomPassagePayload | null>(
    null,
  );
  const [missingCustom, setMissingCustom] = useState(false);

  useEffect(() => {
    if (passageId !== "custom") {
      setPassage(getPassage(passageId) ?? PASSAGES[0]);
      setCustomMeta(null);
      setMissingCustom(false);
      return;
    }
    const stored = loadCustomPassage();
    if (!stored) {
      setMissingCustom(true);
      setPassage(null);
      return;
    }
    setCustomMeta(stored);
    setPassage(customPayloadToPassage(stored));
    setMissingCustom(false);
  }, [passageId]);

  if (missingCustom) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-[#14181f] p-8 text-center ring-1 ring-white/10">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-white">
          No upload found
        </h2>
        <p className="mt-3 text-sm text-white/55">
          Upload or paste your material on the home page, then start the race
          from there.
        </p>
        <Link
          href="/#upload"
          className="mt-6 inline-block rounded-full bg-amber-300 px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#14181f]"
        >
          Upload a file
        </Link>
      </div>
    );
  }

  if (!passage) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-sm text-white/50">
        Loading your track…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customMeta?.truncated && (
        <p className="mx-auto max-w-3xl rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-300/25">
          Racing the first {passage.text.split(/\s+/).length} words of{" "}
          <strong>{customMeta.sourceName}</strong> ({customMeta.wordCount} total
          in file).
        </p>
      )}
      <RaceScreen passage={passage} />
    </div>
  );
}
