"use client";

import { ActionButton } from "@skilltrials/ui";
import { useEffect } from "react";

export default function SampleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Sample trial failed", error);
  }, [error]);

  return (
    <main className="message-page">
      <p className="eyebrow">Sample unavailable</p>
      <h1>The incident room could not be opened.</h1>
      <p>No source material was sent. Restart the bundled sample to restore its deterministic state.</p>
      <ActionButton onClick={reset}>Restart sample</ActionButton>
    </main>
  );
}
