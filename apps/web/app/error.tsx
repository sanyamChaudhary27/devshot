"use client";

import { ActionButton } from "@skilltrials/ui";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="message-page">
      <p className="eyebrow">Trial interrupted</p>
      <h1>This run could not continue.</h1>
      <p>No private source material is shown here. You can retry this screen or return to a known-good trial.</p>
      <ActionButton onClick={reset}>Try again</ActionButton>
    </main>
  );
}
