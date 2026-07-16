import Link from "next/link";
import { LoginForm } from "./login-form";
import { safeReturnPath } from "../../lib/auth/safe-return";

export const metadata = { title: "Sign in | SkillTrials" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; auth?: string }> }) {
  const { next, auth } = await searchParams;
  return <main className="login-shell"><header className="create-topbar"><Link className="wordmark" href="/">skill<span>trials</span></Link></header><section className="login-card"><p className="eyebrow">Author access</p><h1>Build a source-grounded trial.</h1><p>We use a passwordless link so authors can return to private source material without managing another password.</p>{auth === "retry" ? <p className="form-message form-message--error" role="alert">That sign-in link has expired or was already used. Request a fresh link to continue.</p> : null}<LoginForm nextPath={safeReturnPath(next)} /></section></main>;
}
