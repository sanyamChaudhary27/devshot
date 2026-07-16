"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { message: "", success: false };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(requestMagicLink, initialState);
  return <form className="login-form" action={action}>
    <input name="nextPath" type="hidden" value={nextPath} />
    <label>Email address<input autoComplete="email" name="email" required type="email" /></label>
    <button className="ui-action" disabled={pending} type="submit">{pending ? "Sending secure link…" : "Email me a sign-in link"}</button>
    {state.message ? <p className={state.success ? "form-message" : "form-message form-message--error"} aria-live="polite">{state.message}</p> : null}
  </form>;
}
