"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { supabaseUrlLooksWrong } from "@/lib/supabase/config";

export function SignInForm() {
  const supabase = getBrowserSupabase();
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(params.get("error") ? "error" : "idle");
  const [message, setMessage] = useState(params.get("error") ? "That sign-in link didn't work or has expired. Request a new one, then type the code from the email here." : "");

  if (!supabase) {
    return (
      <Card><CardHeader><CardTitle>Accounts aren&apos;t switched on</CardTitle>
        <CardDescription>This deployment runs in guest mode: your progress is saved in this browser. The site owner can enable accounts by connecting Supabase.</CardDescription></CardHeader>
        <CardContent><Button asChild><Link href="/dashboard">Continue as a guest</Link></Button></CardContent></Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setState("error"); setMessage("Enter a valid email address."); return; }
    setState("sending");
    try {
      const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) { setState("error"); setMessage(friendly(error.message)); } else setState("sent");
    } catch (e) {
      setState("error"); setMessage(friendly((e as Error).message));
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(token)) { setCodeError("Enter the code from the email (numbers only)."); return; }
    setVerifying(true); setCodeError("");
    try {
      const { error } = await supabase!.auth.verifyOtp({ email, token, type: "email" });
      if (error) { setCodeError(/expired|invalid/i.test(error.message) ? "That code didn't work or has expired. Check you used the newest email, or request a new code." : friendly(error.message)); setVerifying(false); }
      else { router.push("/dashboard"); router.refresh(); }
    } catch (e) {
      setCodeError(friendly((e as Error).message)); setVerifying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in or create an account</CardTitle>
        <CardDescription>We&apos;ll email you a code and a link; no password needed. Anything you&apos;ve done as a guest in this browser moves into your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {supabaseUrlLooksWrong() && <p className="mb-4 text-sm text-loss" role="alert">Setup problem: NEXT_PUBLIC_SUPABASE_URL should be just your Supabase Project URL, like https://abcd.supabase.co, with nothing after it. Fix it in Vercel and redeploy.</p>}
        {state === "sent" ? (
          <form onSubmit={verify} className="space-y-4" noValidate>
            <p>We&apos;ve emailed <strong>{email}</strong>. Type the code from the email here, or tap the link in it.</p>
            <div className="grid gap-1.5"><Label htmlFor="code">Code from the email</Label>
              <Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" /></div>
            {codeError && <p className="text-sm text-loss" role="alert">{codeError}</p>}
            <Button type="submit" disabled={verifying} className="w-full">{verifying ? "Checking…" : "Sign in"}</Button>
            <p className="text-center text-sm text-muted-foreground"><button type="button" className="underline" onClick={() => { setState("idle"); setCode(""); setCodeError(""); }}>Use a different email or send a new code</button></p>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-1.5"><Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            {state === "error" && <p className="text-sm text-loss" role="alert">{message}</p>}
            <Button type="submit" disabled={state === "sending"} className="w-full">{state === "sending" ? "Sending…" : "Email me a sign-in code"}</Button>
            <p className="text-center text-sm text-muted-foreground"><Link href="/dashboard" className="underline">Continue as a guest</Link></p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/** Turns network-level failures into something the site owner can act on. */
function friendly(message: string) {
  if (/load failed|failed to fetch|networkerror|fetch failed/i.test(message)) {
    return "Couldn't reach the sign-in service. If you run this site, check NEXT_PUBLIC_SUPABASE_URL is your Supabase Project URL (https://<project>.supabase.co, nothing after it), then redeploy.";
  }
  if (/invalid api key/i.test(message)) {
    return "The sign-in service rejected this site's key. If you run this site, set NEXT_PUBLIC_SUPABASE_ANON_KEY to your Supabase publishable key (sb_publishable_…) or legacy anon public key, then redeploy.";
  }
  if (/rate limit|too many/i.test(message)) return "Too many sign-in emails were requested. Wait a few minutes and try again.";
  return message;
}
