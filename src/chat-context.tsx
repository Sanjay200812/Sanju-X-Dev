import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

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

interface ChatContextType {
  messages: ChatMessage[];
  busy: boolean;
  mode: string;
  floatingOpen: boolean;
  setFloatingOpen: (open: boolean) => void;
  ask: (question: string) => Promise<void>;
  clearMessages: () => void;
}

const initialMessage: ChatMessage = {
  role: "assistant",
  text: "Hi, I’m spideyy! I can help you understand our services, suggest the right website for your business, explain features, or check your project status.",
  links: [
    { label: "What kind of website do I need?", url: "ask:What kind of website does my business need?" },
    { label: "Start a Project Brief", url: "/contact" },
    { label: "Track a Project", url: "/track" },
  ],
  mode: "spideyy assistant",
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("spideyy assistant");
  const [floatingOpen, setFloatingOpen] = useState(false);

  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || busy) return;

    // Append user message
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed, timestamp: new Date().toISOString() },
    ]);
    setBusy(true);

    try {
      const recentHistory = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history: recentHistory }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to get an answer.");

      setMode(data.mode || "spideyy assistant");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          links: data.links || [],
          mode: data.mode,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMode("FAQ guide");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I couldn’t reach the assistant service right now. You can explore our five case studies in Our Work or share your requirements directly through our Contact form.",
          links: [
            { label: "Explore Our Work", url: "/work" },
            { label: "Start a Project", url: "/contact" },
            { label: "Track Status", url: "/track" },
          ],
          mode: "FAQ guide",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const clearMessages = useCallback(() => {
    setMessages([initialMessage]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        busy,
        mode,
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
