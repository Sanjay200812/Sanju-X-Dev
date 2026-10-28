import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";

export type AiStatus = "Available" | "Connecting" | "Limited Assistance" | "Unavailable";

export interface ChatLink {
  label: string;
  url: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  links?: ChatLink[];
  mode?: string;
  timestamp?: string;
}

export const STARTER_QUESTIONS = [
  "What website is right for me?",
  "Can you build an online store?",
  "How do I start a project?",
];

interface ChatContextType {
  messages: ChatMessage[];
  busy: boolean;
  status: AiStatus;
  floatingOpen: boolean;
  setFloatingOpen: (open: boolean) => void;
  ask: (question: string) => Promise<void>;
  clearMessages: () => void;
}

const initialMessage: ChatMessage = {
  role: "assistant",
  text: "Hi, I'm Spideyy! I can help you understand our services, recommend the right website type, explain features, or plan your project.",
  links: [],
  mode: "Spideyy",
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const messagesRef = useRef<ChatMessage[]>([initialMessage]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AiStatus>("Connecting");
  const [floatingOpen, setFloatingOpen] = useState(false);

  // Sync ref whenever state changes
  messagesRef.current = messages;

  // Initial health check to determine true provider status
  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        const res = await fetch("/api/chat", { method: "GET" });
        if (res.ok && active) {
          const data = await res.json();
          setStatus(data.status === "Available" ? "Available" : "Limited Assistance");
        } else if (active) {
          setStatus("Limited Assistance");
        }
      } catch {
        if (active) setStatus("Limited Assistance");
      }
    }
    void checkHealth();
    return () => {
      active = false;
    };
  }, []);

  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || busy) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Filter out initial greeting to send clean conversation turns to backend
    const conversationHistory = messagesRef.current
      .filter((m) => m !== initialMessage)
      .slice(-10)
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    const nextMessages = [...messagesRef.current, userMessage];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setBusy(true);
    setStatus("Connecting");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history: conversationHistory }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to get an answer.");

      const isLiveAi = data.mode === "AI assistant";
      const resolvedStatus: AiStatus = isLiveAi ? "Available" : "Limited Assistance";
      setStatus(resolvedStatus);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        text: data.answer,
        links: data.links || [],
        mode: isLiveAi ? "Spideyy AI" : "Spideyy",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...messagesRef.current, assistantMessage];
      messagesRef.current = finalMessages;
      setMessages(finalMessages);
    } catch {
      setStatus("Limited Assistance");
      const fallbackMessage: ChatMessage = {
        role: "assistant",
        text: "I couldn't reach the live AI assistant right now. You can explore our verified projects in Our Work or share your project requirements directly through our Project page.",
        links: [
          { label: "Start Your Project", url: "/project" },
          { label: "View Projects", url: "/work" },
        ],
        mode: "Limited Assistance",
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...messagesRef.current, fallbackMessage];
      messagesRef.current = finalMessages;
      setMessages(finalMessages);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const clearMessages = useCallback(() => {
    messagesRef.current = [initialMessage];
    setMessages([initialMessage]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        busy,
        status,
        floatingOpen,
        setFloatingOpen,
        ask,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
