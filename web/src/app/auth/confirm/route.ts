import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// Email-link landing that works in any browser: the link carries a one-time token hash
// (not a PKCE code), so it doesn't matter that a phone's mail app opens it in its own browser.
// Needs the Supabase email template to link to /auth/confirm?token_hash={{ .TokenHash }}&type=email.
const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await getServerSupabase();
  if (supabase && tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
}
