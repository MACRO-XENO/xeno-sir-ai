import React, { useState } from "react";
import { useLectures, useExamGenerator } from "@/hooks/use-api-hooks";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import { GraduationCap, BookOpen, AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentExam() {
  const { data: lectures = [], isLoading: isLoadingLectures } = useLectures();
  const generateExam = useExamGenerator();
  
  const [isStarted, setIsStarted] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form State
  const [difficulty, setDifficulty] = useState("medium");
  const [examType, setExamType] = useState("mcq");
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedLectures, setSelectedLectures] = useState<number[]>([]);

  const handleGenerate = async () => {
    try {
      const data = await generateExam.mutateAsync({
        data: {
          difficulty: difficulty as any,
          examType: examType as any,
          questionCount,
          lectureIds: selectedLectures.length > 0 ? selectedLectures : undefined,
        }
      });
      setExamData(data);
      setIsStarted(true);
      setAnswers({});
      setIsSubmitted(false);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateScore = () => {
    if (!examData || examType === "subjective") return null;
    let correct = 0;
    examData.questions.forEach((q: any) => {
      if (answers[q.questionNumber] === q.correctAnswer) correct++;
    });
    return Math.round((correct / examData.totalQuestions) * 100);
  };

  if (!isStarted) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/30 mb-6 shadow-xl shadow-primary/10">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">Xeno Sir Masterclass Exam</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Test your macroeconomics knowledge. Generate a custom exam based on actual lecture transcripts, from basic definitions to extreme edge cases.
            </p>
          </div>

          <Card className="border-primary/20 shadow-2xl">
            <CardHeader className="border-b border-white/5 bg-black/20">
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Exam Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-8">
              
              {/* Difficulty */}
              <div className="space-y-4">
                <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Difficulty Level</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["basic", "medium", "advanced", "extreme"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={cn(
                        "px-4 py-4 rounded-xl border transition-all duration-200 text-center uppercase tracking-wider text-sm font-semibold",
                        difficulty === level 
                          ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10" 
                          : "bg-black/30 border-white/10 text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type & Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Question Type</label>
                  <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
                    {["mcq", "subjective", "mixed"].map(t => (
                      <button
                        key={t}
                        onClick={() => setExamType(t)}
                        className={cn(
                          "flex-1 py-2 text-sm font-medium rounded-lg uppercase transition-colors",
                          examType === t ? "bg-secondary text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex justify-between">
                    <span>Number of Questions</span>
                    <span className="text-primary">{questionCount}</span>
                  </label>
                  <input 
                    type="range" 
                    min="5" max="30" step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {/* Lectures */}
              <div className="space-y-4">
                <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  <span>Focus Lectures</span>
                  <span className="text-xs normal-case font-normal">{selectedLectures.length === 0 ? "All Lectures" : `${selectedLectures.length} selected`}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto p-1">
                  {isLoadingLectures ? (
                    <p className="text-muted-foreground text-sm col-span-full">Loading lectures...</p>
                  ) : lectures.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLectures(prev => prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id])}
                      className={cn(
                        "text-left px-4 py-3 rounded-xl border transition-all text-sm flex items-center gap-3",
                        selectedLectures.includes(l.id)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-black/30 border-white/5 text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors", selectedLectures.includes(l.id) ? "bg-primary border-primary text-background" : "border-white/20")}>
                        {selectedLectures.includes(l.id) && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span className="truncate">L{l.lectureNumber}: {l.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <Button 
                  onClick={handleGenerate} 
                  isLoading={generateExam.isPending}
                  className="w-full h-14 text-lg"
                >
                  Generate Paper <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const score = calculateScore();

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Exam Mode</h2>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="outline">{examData?.difficulty.toUpperCase()}</Badge>
            <span className="text-xs text-muted-foreground">{examData?.totalQuestions} Questions</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted && score !== null && (
            <div className="bg-primary/20 border border-primary/30 px-4 py-1.5 rounded-full">
              <span className="text-primary font-bold">Score: {score}%</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsStarted(false)}>
            <RefreshCw className="w-4 h-4 mr-2" /> New Exam
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8 pb-32">
        {examData?.questions.map((q: any, idx: number) => (
          <Card key={idx} className="border-white/10 shadow-lg overflow-hidden">
            <div className="bg-secondary/50 px-6 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-primary font-bold font-display tracking-wider">Question {q.questionNumber}</span>
              <Badge variant="outline" className="bg-black/40">{q.type.toUpperCase()}</Badge>
            </div>
            <CardContent className="p-6 md:p-8 space-y-6">
              <p className="text-lg font-medium text-foreground leading-relaxed">{q.question}</p>
              
              {q.type === "mcq" ? (
                <div className="space-y-3">
                  {q.options?.map((opt: string, oIdx: number) => {
                    const isSelected = answers[q.questionNumber] === opt;
                    const isCorrect = isSubmitted && q.correctAnswer === opt;
                    const isWrong = isSubmitted && isSelected && !isCorrect;

                    return (
                      <button
                        key={oIdx}
                        disabled={isSubmitted}
                        onClick={() => setAnswers(prev => ({...prev, [q.questionNumber]: opt}))}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-xl border transition-all flex items-start gap-4",
                          !isSubmitted && isSelected ? "bg-primary/10 border-primary text-primary" : "bg-black/30 border-white/5 hover:bg-white/5",
                          isCorrect && "bg-green-500/10 border-green-500 text-green-400",
                          isWrong && "bg-destructive/10 border-destructive text-destructive"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center",
                          isSelected ? "border-primary" : "border-white/20",
                          isCorrect && "border-green-500 bg-green-500",
                          isWrong && "border-destructive bg-destructive"
                        )}>
                          {isSelected && !isSubmitted && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                          {(isCorrect || isWrong) && <CheckCircle2 className="w-3 h-3 text-background" />}
                        </div>
                        <span className="leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  disabled={isSubmitted}
                  value={answers[q.questionNumber] || ""}
                  onChange={e => setAnswers(prev => ({...prev, [q.questionNumber]: e.target.value}))}
                  placeholder="Type your detailed answer here..."
                  className="w-full min-h-[150px] bg-black/40 border border-white/10 rounded-xl p-4 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-70"
                />
              )}

              {/* Result/Explanation Section */}
              <AnimatePresence>
                {isSubmitted && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 p-6 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <BookOpen className="w-5 h-5" />
                        Xeno Sir's Explanation
                      </div>
                      {q.type === "mcq" && (
                        <p className="text-foreground"><strong>Correct Answer:</strong> {q.correctAnswer}</p>
                      )}
                      <div className="text-muted-foreground leading-relaxed prose prose-invert max-w-none">
                         <ReactMarkdown>{q.explanation}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        ))}

        {!isSubmitted && (
          <div className="flex justify-end pt-8">
            <Button size="lg" onClick={() => setIsSubmitted(true)} className="px-12 shadow-2xl shadow-primary/20">
              Submit Answers <CheckCircle2 className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
