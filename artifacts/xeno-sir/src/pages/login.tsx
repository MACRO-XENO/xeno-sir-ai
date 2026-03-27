import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-api-hooks";
import { setAuthToken } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Input, Button } from "@/components/ui";
import { BookOpen, User, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

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
      
      // Force reload to let auth state initialize cleanly
      window.location.href = res.user.role === "admin" ? "/admin" : "/";
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background image from requirements.yaml */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/library-bg.png`} 
          alt="Dark Academic Library" 
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-black/40 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/20 mb-6"
          >
            <img 
              src={`${import.meta.env.BASE_URL}images/xeno-logo.png`} 
              alt="Xeno Sir Logo" 
              className="w-16 h-16 object-contain drop-shadow-md"
            />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-primary to-yellow-700 tracking-tight">
            XENO SIR
          </h1>
          <p className="text-muted-foreground mt-3 text-lg font-medium tracking-wide">Premium Macroeconomics AI Tutor</p>
        </div>

        <Card className="border-primary/20 shadow-2xl shadow-black/80">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-foreground font-sans">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive-foreground text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Username" 
                    className="pl-11 bg-black/50 border-white/10"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="Password" 
                    className="pl-11 bg-black/50 border-white/10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full text-base tracking-wide h-12 mt-2">
                Enter Portal
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
