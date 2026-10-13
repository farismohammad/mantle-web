import Link from "next/link";
import { MantleMark } from "@/components/mantle-mark";
export default function NotFound() {
  return (
    <main id="workspace" className="page state-page">
      <MantleMark className="state-mark" />
      <p className="eyebrow">404 · Not found</p>
      <h1>Configuration not found</h1>
      <p>
        The agent, revision, or page you requested doesn’t exist. It may have
        been removed, or the address may be incorrect.
      </p>
      <Link className="button" href="/">
        Back to agents
      </Link>
    </main>
  );
}
