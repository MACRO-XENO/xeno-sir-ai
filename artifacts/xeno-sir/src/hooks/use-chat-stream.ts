import { useState, useCallback, useRef } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    question: string, 
    lectureIds?: number[], 
    language?: string,
    existingConversationId?: number
  ) => {
    if (!question.trim() || isStreaming) return;

    const convIdToUse = existingConversationId || activeConversationId;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: question
    };
    
    const newAssistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: ""
    };

    setMessages(prev => [...prev, newUserMsg, newAssistantMsg]);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          question,
          lectureIds,
          conversationId: convIdToUse,
          language: language || "auto"
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedContent = "";

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const dataStr = line.slice(6);
                if (!dataStr) continue;
                
                const data = JSON.parse(dataStr);
                
                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.conversationId && !convIdToUse) {
                  setActiveConversationId(data.conversationId);
                  queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
                }

                if (data.content) {
                  streamedContent += data.content;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const last = newMsgs[newMsgs.length - 1];
                    if (last.role === "assistant") {
                      last.content = streamedContent;
                    }
                    return newMsgs;
                  });
                }

                if (data.done) {
                  done = true;
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Stream error:", error);
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          if (last.role === "assistant" && !last.content) {
            last.content = "Sorry, an error occurred while connecting to Xeno Sir.";
          }
          return newMsgs;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, activeConversationId, queryClient]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  const loadConversation = useCallback((id: number, initialMessages: any[]) => {
    setActiveConversationId(id);
    setMessages(initialMessages.map(m => ({
      id: m.id.toString(),
      role: m.role as "user" | "assistant",
      content: m.content
    })));
  }, []);

  const resetChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    activeConversationId,
    loadConversation,
    resetChat
  };
}
