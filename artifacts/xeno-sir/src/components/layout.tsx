import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-api-hooks";
import { LogOut, MessageSquare, GraduationCap, LayoutDashboard, Users, Book, NotebookText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

function XenoSirLogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="29" stroke="url(#gSidebar)" strokeWidth="1.5" />
      <text x="32" y="27" textAnchor="middle" fill="#d4a017" fontSize="12" fontWeight="700" fontFamily="serif" letterSpacing="1">
        XS
      </text>
      <line x1="14" y1="31" x2="50" y2="31" stroke="#d4a017" strokeWidth="0.8" opacity="0.5" />
      <text x="32" y="42" textAnchor="middle" fill="#f5d87a" fontSize="8" fontFamily="serif" letterSpacing="3">
        SIR
      </text>
      <defs>
        <linearGradient id="gSidebar" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5d87a" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isAdmin = user.role === "admin";

  const studentLinks = [
    { href: "/", label: "Ask Xeno Sir", icon: MessageSquare },
    { href: "/notes", label: "Notes", icon: NotebookText },
    { href: "/exam", label: "Take Exam", icon: GraduationCap },
  ];

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/lectures", label: "Lectures", icon: Book },
    { href: "/admin/students", label: "Students", icon: Users },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background overflow-hidden">
      {/* Sidebar */}
      {/* Mobile: slim horizontal top bar */}
      <aside className="md:hidden w-full bg-card/80 backdrop-blur-xl border-b border-white/5 flex-shrink-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-primary/25">
              <XenoSirLogoMark />
            </div>
            <span
              className="font-bold text-base text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-primary tracking-[0.1em]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              XENO SIR
            </span>
          </div>
          {/* Nav links with icons + labels + sign out */}
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  <span className="text-[9px] font-medium leading-none">{link.label}</span>
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop: full sidebar */}
      <aside className="hidden md:flex w-72 bg-card/50 backdrop-blur-xl border-r border-white/5 flex-col flex-shrink-0 z-20 h-full">
        <div className="p-5 flex items-center gap-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center border border-primary/25 shadow-lg shadow-primary/10 shrink-0">
            <XenoSirLogoMark />
          </div>
          <div>
            <h1
              className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-primary leading-none tracking-[0.12em]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              XENO SIR
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">
              {isAdmin ? "Admin Portal" : "Macroeconomics"}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
          {links.map((link) => {
            const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-inner"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <link.icon className={cn("w-5 h-5", isActive ? "text-primary" : "opacity-70")} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto">
          <div className="bg-black/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-lg border border-white/10 shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={logout}>
              <LogOut className="w-3 h-3 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
