import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
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
  text: "Hi, I'm Spideyy! I can help you understand our services, recommend the right website type, explain features, or answer any questions about your project.",
  links: [
    { label: "What website is right for me?", url: "ask:What website is right for me?" },
    { label: "Start Your Project", url: "/contact" },
    { label: "Track a Project", url: "/track" },
  ],
  mode: "Spideyy",
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const messagesRef = useRef<ChatMessage[]>([initialMessage]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("Spideyy");
  const [floatingOpen, setFloatingOpen] = useState(false);

  // Sync ref whenever state changes
  messagesRef.current = messages;

  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || busy) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Keep conversation history up to date immediately without stale closures
    const previousHistory = messagesRef.current.slice(-10).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const nextMessages = [...messagesRef.current, userMessage];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history: previousHistory }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to get an answer.");

      const newMode = data.mode === "AI assistant" ? "AI Online" : "Spideyy";
      setMode(newMode);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        text: data.answer,
        links: data.links || [],
        mode: newMode,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...messagesRef.current, assistantMessage];
      messagesRef.current = finalMessages;
      setMessages(finalMessages);
    } catch {
      setMode("FAQ guide");
      const fallbackMessage: ChatMessage = {
        role: "assistant",
        text: "I couldn't reach the live AI assistant right now. You can explore our five case studies in Our Work or share your requirements directly through our Contact form.",
        links: [
          { label: "Explore Our Work", url: "/work" },
          { label: "Start a Project", url: "/contact" },
          { label: "Track Status", url: "/track" },
        ],
        mode: "FAQ guide",
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
