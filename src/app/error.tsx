"use client";
import Link from "next/link";
import { MantleMark } from "@/components/mantle-mark";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="workspace" className="page state-page">
      <MantleMark className="state-mark" />
      <p className="eyebrow">Registry unavailable</p>
      <h1>Couldn’t load the registry</h1>
      <p>
        This instance couldn’t read the requested configuration. The repository
        may be unavailable, or a stored revision may need attention.
      </p>
      <div className="state-actions">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link href="/">Back to agents</Link>
      </div>
    </main>
  );
}
