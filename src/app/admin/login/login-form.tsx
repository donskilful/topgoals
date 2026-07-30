"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

const INITIAL_STATE: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-floodlight-dim">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="rounded-lg border border-line bg-charcoal-2 px-3 py-2.5 text-sm text-floodlight placeholder:text-floodlight-faint"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-wide text-floodlight-dim"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-line bg-charcoal-2 px-3 py-2.5 text-sm text-floodlight placeholder:text-floodlight-faint"
          placeholder="••••••••"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-[rgba(255,71,87,0.3)] bg-[rgba(255,71,87,0.1)] px-3 py-2.5 text-[13px] text-whistle"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 rounded-lg bg-torch px-4 py-2.5 text-sm font-extrabold text-ink transition-all hover:bg-[#ffc766] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
