import React, { useState, useRef, useEffect } from "react";
import { useAuth, useLectures, useConversations } from "@/hooks/use-api-hooks";
import { useChatStream } from "@/hooks/use-chat-stream";
import { Button } from "@/components/ui";
import { Send, Bot, User, MessageSquarePlus, RefreshCw, BookOpen, Check, Menu, Globe, ImagePlus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/utils";

export default function StudentChat() {
  const { user } = useAuth();
  const { data: lectures = [], isLoading: isLoadingLectures } = useLectures();
  const { data: conversations = [], refetch: refetchConvs } = useConversations();

  const [input, setInput] = useState("");
  const [selectedLectures, setSelectedLectures] = useState<number[]>([]);
  const [language, setLanguage] = useState("auto");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 768
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    activeConversationId,
    loadConversation,
    resetChat
  } = useChatStream();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageBase64) || isStreaming) return;
    sendMessage(input, selectedLectures.length > 0 ? selectedLectures : undefined, language, undefined, imageBase64 || undefined);
    setInput("");
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageBase64(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLectureToggle = (id: number) => {
    setSelectedLectures(prev =>
      prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]
    );
  };

  const handleLoadConversation = async (convId: number) => {
    if (activeConversationId === convId) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/openai/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        loadConversation(convId, data.messages || []);
      }
    } catch {
      // silently fail
    }
  };

  const handleNewChat = () => {
    resetChat();
    refetchConvs();
  };

  const hasNoLectures = !isLoadingLectures && lectures.length === 0;

  return (
    <div className="flex h-full w-full relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-background relative z-10 min-w-0">

        {/* Top Bar */}
        <header className="h-16 px-4 md:px-8 border-b border-white/5 flex items-center justify-between bg-card/30 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground leading-tight">Xeno Sir</h2>
                <p className="text-[10px] text-primary uppercase tracking-widest">
                  {isStreaming ? "Typing..." : "Active Session"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="w-3 h-3" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="auto">Auto (Bilingual)</option>
                <option value="hindi">Hindi/Urdu</option>
                <option value="english">English</option>
              </select>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {hasNoLectures ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mb-6" />
              <h2 className="text-2xl font-bold text-primary mb-2">Platform Launching Soon</h2>
              <p className="text-muted-foreground">Abhi tak koi lecture nahi dala gaya. Admin thoda ruko — lectures upload hote hi Xeno Sir ready hain tumhare saath!</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-transparent p-1 mb-8"
              >
                <div className="w-full h-full rounded-full bg-card border border-primary/30 flex items-center justify-center shadow-xl shadow-primary/10">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-bold text-foreground mb-4"
              >
                Xeno Sir se puchho <span className="text-primary">kuch bhi!</span>
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-muted-foreground mb-8"
              >
                Ask anything about Macroeconomics — inflation, GDP, monetary policy, fiscal policy, and more. Xeno Sir explains everything from basics to expert level with global examples.
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg"
              >
                {[
                  "Inflation kya hoti hai? Basic se explain karo",
                  "GDP aur GNP mein kya fark hai?",
                  "Monetary policy kaise kaam karti hai India mein?",
                  "What caused Zimbabwe's hyperinflation?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="text-left px-4 py-3 rounded-xl bg-card/50 border border-white/5 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <div className={cn(
                    "w-10 h-10 shrink-0 rounded-full flex items-center justify-center border",
                    msg.role === "user"
                      ? "bg-secondary border-white/10"
                      : "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10"
                  )}>
                    {msg.role === "user" ? <User className="w-5 h-5 text-foreground" /> : <Bot className="w-5 h-5 text-primary" />}
                  </div>

                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-6 py-4",
                    msg.role === "user"
                      ? "bg-secondary border border-white/5"
                      : "bg-transparent border-none px-0"
                  )}>
                    {msg.role === "user" ? (
                      <div className="space-y-2">
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded"
                            className="max-w-[240px] max-h-[180px] rounded-xl object-contain border border-white/10"
                          />
                        )}
                        {msg.content && (
                          <p className="text-foreground whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-p:text-foreground/90 prose-headings:text-primary prose-strong:text-foreground prose-code:text-primary prose-ul:text-foreground/90 prose-ol:text-foreground/90 max-w-none">
                        {msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <div className="flex items-center gap-2 text-primary py-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.15s" }}></span>
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }}></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent shrink-0">
          <div className="max-w-4xl mx-auto relative">
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-2 pl-2">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-auto rounded-xl border border-white/10 object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-card border border-white/10 rounded-2xl shadow-2xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || !!imageBase64}
                className="shrink-0 w-10 h-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-white/5 flex items-center justify-center transition-colors disabled:opacity-30"
                title="Photo attach karo"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <textarea
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Apna doubt ya sawaal yahan likhiye... (Shift+Enter for new line)"
                className="w-full max-h-[200px] min-h-[52px] bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground py-3 px-2 leading-relaxed"
                disabled={isStreaming}
                rows={1}
              />
              <div className="shrink-0 p-1">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="w-10 h-10 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    title="Stop generating"
                  >
                    <span className="w-4 h-4 bg-destructive rounded-sm" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={(!input.trim() && !imageBase64) || hasNoLectures}
                    className="w-10 h-10 rounded-xl bg-primary text-background flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                )}
              </div>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Xeno Sir AI Tutor • Macroeconomics Expert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Context Sidebar */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {sidebarOpen && (
          <motion.div
            initial={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
            animate={isMobile ? { x: 0 } : { width: 300, opacity: 1 }}
            exit={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "bg-card/95 backdrop-blur-xl flex flex-col overflow-hidden",
              isMobile
                ? "fixed right-0 top-0 bottom-0 w-[280px] z-50 border-l border-white/10 shadow-2xl"
                : "border-l border-white/5 shrink-0 w-[300px]"
            )}
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMobile && (
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    title="Close"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
                <h3 className="font-semibold text-foreground text-sm">Study Context</h3>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-7">
              {/* Lecture Selection */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Focus Lectures
                </h4>
                {isLoadingLectures ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : lectures.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No lectures available yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setSelectedLectures([])}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all border",
                        selectedLectures.length === 0
                          ? "bg-primary/10 border-primary/30 text-primary font-medium"
                          : "bg-transparent border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      )}
                    >
                      ✦ All Lectures ({lectures.length})
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    {lectures.map(l => (
                      <button
                        key={l.id}
                        onClick={() => handleLectureToggle(l.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all border flex items-start gap-2",
                          selectedLectures.includes(l.id)
                            ? "bg-primary/10 border-primary/30 text-primary font-medium"
                            : "bg-black/20 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors",
                          selectedLectures.includes(l.id) ? "bg-primary border-primary" : "border-white/20"
                        )}>
                          {selectedLectures.includes(l.id) && <Check className="w-3 h-3 text-background" />}
                        </div>
                        <span className="line-clamp-2 leading-tight">
                          <span className="text-primary/70 font-medium">L{l.lectureNumber}</span> {l.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat History */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Past Chats
                </h4>
                <div className="space-y-1.5">
                  {conversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No history yet. Start asking!</p>
                  ) : (
                    conversations.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleLoadConversation(c.id)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border group",
                          activeConversationId === c.id
                            ? "bg-secondary border-white/10 text-foreground"
                            : "bg-transparent border-transparent text-muted-foreground hover:bg-white/5 hover:border-white/5"
                        )}
                      >
                        <span className="line-clamp-1 group-hover:text-primary transition-colors text-xs font-medium">{c.title}</span>
                        <span className="text-[10px] opacity-40 block mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
