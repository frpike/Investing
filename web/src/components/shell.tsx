"use client";

import { BookOpen, ChartPie, GraduationCap, LayoutDashboard, MessageCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useApp } from "./app-state";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/tutor", label: "Tutor", icon: MessageCircle },
  { href: "/portfolio", label: "Portfolio", icon: ChartPie },
  { href: "/progress", label: "Progress", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { mode, accountsEnabled, user } = useApp();
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/dashboard" className="font-serif text-lg font-semibold tracking-tight">Groundwork</Link>
          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href}
                className={cn("rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  path.startsWith(href) && "bg-muted font-medium text-foreground")}
                aria-current={path.startsWith(href) ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {mode === "guest" ? (
              <>
                <Badge variant="outline" title="Your progress is saved in this browser only">Guest</Badge>
                {accountsEnabled && <Button asChild size="sm" variant="outline"><Link href="/sign-in">Save progress</Link></Button>}
              </>
            ) : (
              <Badge variant="secondary" title={user?.email ?? undefined}>Signed in</Badge>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-12">{children}</main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground", path.startsWith(href) && "font-medium text-primary")}
            aria-current={path.startsWith(href) ? "page" : undefined}>
            <Icon className="size-5" aria-hidden />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
