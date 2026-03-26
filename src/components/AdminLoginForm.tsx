"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, LoaderCircle, UserRound } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("Devin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Private access only.");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("Checking credentials...");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Login failed.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="lead-form admin-login-form" onSubmit={handleSubmit}>
      <label>
        <span>
          <UserRound className="size-4" />
          Username
        </span>
        <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
      </label>

      <label>
        <span>
          <LockKeyhole className="size-4" />
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>

      <div className="button-row">
        <button className="button" type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="icon-spin" /> : <LogIn className="size-4" />}
          Sign in
        </button>
      </div>

      <p className="form-state" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
