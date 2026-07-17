import { ReleaseDesk } from "../release-desk";

export const metadata = {
  title: "Runbook Firewall — release gate demo",
  description: "A cited, deterministic pre-execution release gate for risky production changes."
};

export default function SamplePage() {
  return <ReleaseDesk />;
}
