import Link from "next/link";

export default function NotFound() {
  return (
    <main className="message-page">
      <p className="eyebrow">Trial unavailable</p>
      <h1>This simulation does not exist or is not published.</h1>
      <p>Open the bundled laboratory-safety sample instead.</p>
      <Link className="ui-action ui-action--primary" href="/sample">
        Open sample
      </Link>
    </main>
  );
}
