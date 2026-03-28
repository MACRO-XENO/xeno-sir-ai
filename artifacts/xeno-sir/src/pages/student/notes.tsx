import React, { useState } from "react";
import { useLectures } from "@/hooks/use-api-hooks";
import { BookOpen, FileText, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function StudentNotes() {
  const { data: lectures = [], isLoading } = useLectures();
  const [openId, setOpenId] = useState<number | null>(null);

  const lecturesWithNotes = lectures.filter((l: any) => l.notes && l.notes.trim().length > 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="px-6 md:px-10 py-6 border-b border-white/5 bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Lecture Notes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Xeno Sir ke notes — padho, samjho, master karo</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : lecturesWithNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-2xl bg-card border border-white/5 flex items-center justify-center mb-5">
                <FileText className="w-9 h-9 text-muted-foreground/30" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">Notes abhi available nahi hain</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                Jab Xeno Sir notes add karenge, yahan dikh jaayenge. Tab tak AI se seedha poochho!
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-6 font-medium">
                {lecturesWithNotes.length} lecture{lecturesWithNotes.length > 1 ? "s" : ""} with notes
              </p>
              {lecturesWithNotes.map((lecture: any) => {
                const isOpen = openId === lecture.id;
                return (
                  <div
                    key={lecture.id}
                    className="rounded-2xl border border-white/8 bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => setOpenId(isOpen ? null : lecture.id)}
                      className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/3 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] uppercase text-primary font-bold leading-none">Lec</span>
                          <span className="text-base font-display text-primary leading-tight">{lecture.lectureNumber}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-base leading-snug">{lecture.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(lecture.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isOpen ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-7 border-t border-white/5 pt-5">
                        <div className="prose prose-invert prose-sm max-w-none
                          prose-headings:font-display prose-headings:text-foreground prose-headings:font-semibold
                          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                          prose-p:text-foreground/80 prose-p:leading-relaxed
                          prose-strong:text-primary prose-strong:font-semibold
                          prose-em:text-foreground/70
                          prose-ul:space-y-1.5 prose-ol:space-y-1.5
                          prose-li:text-foreground/80 prose-li:leading-relaxed
                          prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:bg-white/3 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                          prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs
                          prose-hr:border-white/10
                          prose-table:text-sm prose-th:text-primary prose-th:font-semibold
                        ">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {lecture.notes}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
