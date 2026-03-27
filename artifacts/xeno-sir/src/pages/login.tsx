import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-api-hooks";
import { setAuthToken } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Input, Button } from "@/components/ui";
import { User, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

function XenoSirLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="url(#grad)" opacity="0.15" />
      <circle cx="32" cy="32" r="30" stroke="url(#grad)" strokeWidth="1.5" />
      <text x="32" y="26" textAnchor="middle" fill="#d4a017" fontSize="11" fontWeight="700" fontFamily="serif" letterSpacing="1">
        XENO
      </text>
      <line x1="14" y1="30" x2="50" y2="30" stroke="#d4a017" strokeWidth="0.8" opacity="0.6" />
      <text x="32" y="42" textAnchor="middle" fill="#f5d87a" fontSize="9" fontFamily="serif" letterSpacing="2">
        SIR
      </text>
      <path d="M24 50 Q32 55 40 50" stroke="#d4a017" strokeWidth="1" fill="none" opacity="0.5" />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5d87a" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await login({ data: { username, password } });
      setAuthToken(res.token);
      localStorage.setItem("xeno_sir_user", JSON.stringify(res.user));
      window.location.href = res.user.role === "admin" ? "/admin" : "/";
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#080c14]">
      {/* Premium layered background */}
      <div className="absolute inset-0 z-0">
        {/* Deep radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(180,140,10,0.08)_0%,transparent_70%)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,160,23,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.6) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        {/* Horizontal accent line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-black/60 backdrop-blur-xl border border-primary/25 shadow-2xl shadow-primary/20 mb-6"
          >
            <XenoSirLogo size={64} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-5xl md:text-6xl font-bold tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-primary to-yellow-700"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            XENO SIR
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-muted-foreground mt-3 text-sm uppercase tracking-[0.3em] font-medium"
          >
            Macroeconomics Tutor
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="h-px w-32 mx-auto mt-4 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="border-primary/15 shadow-2xl shadow-black/80 bg-black/40 backdrop-blur-2xl">
            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-xl text-foreground font-semibold tracking-wide">Welcome Back</CardTitle>
            </CardHeader>
            <CardContent className="pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive-foreground text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
                    {error}
                  </div>
                )}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    className="pl-10 bg-black/50 border-white/10 focus:border-primary/40 h-12"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    className="pl-10 bg-black/50 border-white/10 focus:border-primary/40 h-12"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full text-base tracking-widest h-12 mt-2 font-semibold" style={{ letterSpacing: "0.1em" }}>
                  ENTER PORTAL
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
