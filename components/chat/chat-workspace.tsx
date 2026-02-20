"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import AccountMenu from "@/components/chat/account-menu";

type ChatWorkspaceProps = {
  userName: string;
  userEmail: string;
};

type MessageRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const STORAGE_KEY = "matrix_chat_conversations_v2";
const ACTIVE_STORAGE_KEY = "matrix_chat_active_v2";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function firstTitleFromText(input: string) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 44 ? `${cleaned.slice(0, 44)}...` : cleaned;
}

function toApiMessages(messages: ChatMessage[]) {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));
}

function extractAssistantContent(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";

  const first = choices[0] as {
    message?: {
      content?: unknown;
    };
  };
  const content = first?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function formatTime(epochMs: number) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochMs));
}

function formatHistoryTime(epochMs: number) {
  const date = new Date(epochMs);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatTime(epochMs);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function sanitizeConversations(input: unknown): Conversation[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((conversation) => {
      if (!conversation || typeof conversation !== "object") return null;
      const source = conversation as Partial<Conversation>;
      const messages = Array.isArray(source.messages)
        ? source.messages
            .map((message) => {
              if (!message || typeof message !== "object") return null;
              const msg = message as Partial<ChatMessage>;
              if (
                (msg.role !== "user" && msg.role !== "assistant") ||
                typeof msg.content !== "string" ||
                typeof msg.createdAt !== "number"
              ) {
                return null;
              }
              return {
                id: typeof msg.id === "string" ? msg.id : createId(),
                role: msg.role,
                content: msg.content,
                createdAt: msg.createdAt,
              } satisfies ChatMessage;
            })
            .filter((message): message is ChatMessage => Boolean(message))
        : [];

      const id = typeof source.id === "string" ? source.id : createId();
      const fallbackTitle = messages[0] ? firstTitleFromText(messages[0].content) : "New chat";

      return {
        id,
        title: typeof source.title === "string" && source.title.trim() ? source.title.trim() : fallbackTitle,
        messages,
        updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : Date.now(),
      } satisfies Conversation;
    })
    .filter((conversation): conversation is Conversation => Boolean(conversation));
}

export default function ChatWorkspace({ userName, userEmail }: ChatWorkspaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );
  const userInitials = useMemo(() => initialsFromName(userName || userEmail), [userEmail, userName]);

  const ensureConversation = useCallback(() => {
    const conversation: Conversation = {
      id: createId(),
      title: "New chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
    return conversation.id;
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");

    const updateDesktop = () => {
      const desktop = media.matches;
      setIsDesktop(desktop);
      if (desktop) {
        setMobileSidebarOpen(false);
      }
    };

    updateDesktop();
    media.addEventListener("change", updateDesktop);
    return () => media.removeEventListener("change", updateDesktop);
  }, []);

  useEffect(() => {
    let parsed: Conversation[] = [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      parsed = sanitizeConversations(raw ? JSON.parse(raw) : []);
    } catch {
      parsed = [];
    }

    if (!parsed.length) {
      parsed = [
        {
          id: createId(),
          title: "New chat",
          messages: [],
          updatedAt: Date.now(),
        },
      ];
    }

    const storedActive = window.localStorage.getItem(ACTIVE_STORAGE_KEY) || "";
    const activeExists = parsed.some((conversation) => conversation.id === storedActive);
    setConversations(parsed);
    setActiveConversationId(activeExists ? storedActive : parsed[0].id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    if (activeConversationId) {
      window.localStorage.setItem(ACTIVE_STORAGE_KEY, activeConversationId);
    }
  }, [activeConversationId, conversations, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [activeConversation?.messages.length, isPending]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setError("");
    if (!isDesktop) {
      setMobileSidebarOpen(false);
    }
  };

  const handleCreateConversation = () => {
    ensureConversation();
    setError("");
    if (!isDesktop) {
      setMobileSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((conversation) => conversation.id !== id);

      if (!remaining.length) {
        const nextConversation: Conversation = {
          id: createId(),
          title: "New chat",
          messages: [],
          updatedAt: Date.now(),
        };
        setActiveConversationId(nextConversation.id);
        return [nextConversation];
      }

      const sorted = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt);
      if (!sorted.some((conversation) => conversation.id === activeConversationId)) {
        setActiveConversationId(sorted[0].id);
      }
      return sorted;
    });
  };

  const updateConversation = (id: string, updater: (conversation: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev
        .map((conversation) => (conversation.id === id ? updater(conversation) : conversation))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  const submitMessage = async () => {
    const userPrompt = input.trim();
    if (!userPrompt || isPending) return;

    setInput("");
    setError("");
    setIsPending(true);
    const startedAt = performance.now();

    const currentId = activeConversationId || ensureConversation();
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: userPrompt,
      createdAt: Date.now(),
    };

    let requestMessages: ChatMessage[] = [userMessage];

    updateConversation(currentId, (conversation) => {
      requestMessages = [...conversation.messages, userMessage];
      return {
        ...conversation,
        title:
          conversation.messages.length === 0
            ? firstTitleFromText(userPrompt)
            : conversation.title,
        messages: requestMessages,
        updatedAt: Date.now(),
      };
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toApiMessages(requestMessages),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
        choices?: unknown;
      };

      if (!response.ok) {
        throw new Error(payload.error?.message || `Request failed (${response.status})`);
      }

      const assistantText = extractAssistantContent(payload);
      if (!assistantText) {
        throw new Error("Assistant returned an empty response");
      }

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        createdAt: Date.now(),
      };

      updateConversation(currentId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, assistantMessage],
        updatedAt: Date.now(),
      }));

      await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseMs: Math.max(1, Math.round(performance.now() - startedAt)),
          success: true,
        }),
      }).catch(() => undefined);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Failed to send message";
      setError(message);

      await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseMs: Math.max(1, Math.round(performance.now() - startedAt)),
          success: false,
        }),
      }).catch(() => undefined);
    } finally {
      setIsPending(false);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  return (
    <div className="relative z-10 h-screen overflow-hidden px-3 py-3 md:px-4 md:py-4">
      <div className="mx-auto flex h-full w-full max-w-[1500px] gap-3 md:gap-4">
        <AnimatePresence initial={false}>
          {(isDesktop || mobileSidebarOpen) && (
            <motion.aside
              initial={isDesktop ? false : { x: -24, opacity: 0 }}
              animate={
                isDesktop
                  ? { width: sidebarCollapsed ? 80 : 330, opacity: 1, x: 0 }
                  : { width: 320, opacity: 1, x: 0 }
              }
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={`${
                isDesktop ? "relative" : "absolute inset-y-0 left-0 z-40"
              } flex h-full shrink-0 flex-col overflow-hidden rounded-3xl border border-cyan-200/15 bg-slate-950/72 p-3 shadow-[0_24px_55px_rgba(2,6,23,0.55),0_0_0_1px_rgba(103,232,249,0.1)] backdrop-blur-2xl`}
            >
              <div
                className={`mb-3 border-b border-cyan-100/10 pb-3 ${
                  sidebarCollapsed && isDesktop
                    ? "flex flex-col items-center gap-2"
                    : "flex items-center justify-between gap-2"
                }`}
              >
                {sidebarCollapsed && isDesktop ? null : (
                  <div className="min-w-0">
                    <p className="truncate text-[11px] uppercase tracking-[0.22em] text-cyan-100/55">
                      Matrix Console
                    </p>
                    <h2 className="truncate text-sm font-semibold text-cyan-50">Chat history</h2>
                  </div>
                )}
                <div className={`flex gap-2 ${sidebarCollapsed && isDesktop ? "flex-col" : "items-center"}`}>
                  <button
                    type="button"
                    onClick={handleCreateConversation}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 bg-slate-900/70 text-cyan-100 transition hover:border-cyan-200/40 hover:bg-slate-900/90"
                    aria-label="New chat"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  {isDesktop ? (
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed((prev) => !prev)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 bg-slate-900/70 text-cyan-100 transition hover:border-cyan-200/40 hover:bg-slate-900/90"
                      aria-label={sidebarCollapsed ? "Expand history" : "Collapse history"}
                    >
                      <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 transition ${sidebarCollapsed ? "rotate-180" : ""}`}>
                        <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMobileSidebarOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 bg-slate-900/70 text-cyan-100 transition hover:border-cyan-200/40 hover:bg-slate-900/90"
                      aria-label="Close history"
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1">
                {conversations.map((conversation) => {
                  const active = conversation.id === activeConversationId;
                  return (
                    <div
                      key={conversation.id}
                      className={`group w-full rounded-2xl border transition ${
                        active
                          ? "border-cyan-200/40 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.18)]"
                          : "border-cyan-100/10 bg-slate-900/45 hover:border-cyan-200/30 hover:bg-slate-900/70"
                      } ${
                        sidebarCollapsed
                          ? "flex flex-col items-center gap-1.5 px-2 py-2"
                          : "flex items-center gap-2 px-2 py-2"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`${
                          sidebarCollapsed
                            ? "flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200/25 bg-slate-900/80 text-[11px] font-semibold text-cyan-100"
                            : "min-w-0 flex-1 rounded-xl px-1 py-0.5 text-left"
                        }`}
                        aria-label={`Open chat ${conversation.title}`}
                      >
                        {sidebarCollapsed ? (
                          conversation.title.slice(0, 1).toUpperCase()
                        ) : (
                          <>
                            <p className="truncate text-sm font-medium text-cyan-50">{conversation.title}</p>
                            <p className="mt-1 text-[11px] text-cyan-100/55">
                              {formatHistoryTime(conversation.updatedAt)}
                            </p>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(conversation.id)}
                        className={`inline-flex items-center justify-center rounded-lg border border-cyan-200/20 bg-slate-950/55 text-cyan-100/70 transition hover:border-rose-300/45 hover:bg-rose-500/15 hover:text-rose-100 ${
                          sidebarCollapsed ? "h-7 w-7" : "h-8 w-8 shrink-0"
                        }`}
                        aria-label={`Delete chat ${conversation.title}`}
                        title="Delete chat"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
                          <path
                            d="M6 6L14 14M14 6L6 14"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {!isDesktop && mobileSidebarOpen ? (
          <button
            aria-label="Close history backdrop"
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px]"
          />
        ) : null}

        <section className="relative flex min-w-0 flex-1 flex-col rounded-3xl border border-cyan-200/15 bg-slate-950/62 shadow-[0_24px_55px_rgba(2,6,23,0.48),0_0_0_1px_rgba(103,232,249,0.08)] backdrop-blur-2xl">
          <header className="flex items-center gap-3 border-b border-cyan-100/10 px-3 py-3 md:px-5">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-slate-900/70 text-cyan-100 transition hover:border-cyan-200/40 hover:bg-slate-900/90 lg:hidden"
              aria-label="Open history"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M4 5H16M4 10H16M4 15H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-cyan-50">
                {activeConversation?.title || "New chat"}
              </p>
              <p className="text-xs text-cyan-100/55">Model: gpt-5.2</p>
            </div>

            <AccountMenu name={userName} email={userEmail} />
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5 md:py-5">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mt-16 max-w-xl rounded-3xl border border-cyan-200/18 bg-slate-900/46 p-6 text-center shadow-[0_16px_45px_rgba(2,6,23,0.42)]"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-300/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.26)]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    <path
                      d="M12 4V20M4 12H20"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-cyan-50">Start a new conversation</h3>
                <p className="mt-2 text-sm leading-6 text-cyan-100/65">
                  Ask anything. The assistant will keep context and respond in your language.
                </p>
              </motion.div>
            ) : (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                <AnimatePresence initial={false}>
                  {activeConversation.messages.map((message) => {
                    const isUser = message.role === "user";
                    return (
                      <motion.article
                        key={message.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex max-w-[min(92%,760px)] items-end gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/35 bg-slate-900/70 text-[11px] font-semibold text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.2)]">
                            {isUser ? userInitials : "M"}
                          </div>
                          <div
                            className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                              isUser
                                ? "border-cyan-200/40 bg-cyan-300/12 text-cyan-50"
                                : "border-cyan-100/18 bg-slate-900/62 text-cyan-50/95"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p className="mt-2 text-[11px] text-cyan-100/52">
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>

                <AnimatePresence>
                  {isPending ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/35 bg-slate-900/70 text-[11px] font-semibold text-cyan-100">
                        M
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-100/18 bg-slate-900/62 px-4 py-3">
                        <span className="text-xs text-cyan-100/72">Matrix typing...</span>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200/80 [animation-delay:-0.18s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200/80 [animation-delay:-0.06s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-200/80" />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-cyan-100/10 px-3 py-3 md:px-5 md:py-4">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
              {error ? (
                <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  {error}
                </p>
              ) : null}

              <div className="flex items-end gap-2 rounded-2xl border border-cyan-200/20 bg-slate-900/68 px-3 py-2 shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_8px_30px_rgba(2,6,23,0.35)] backdrop-blur-xl">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  rows={2}
                  placeholder="Write your message..."
                  className="max-h-40 min-h-[50px] flex-1 resize-y bg-transparent px-1 py-1 text-sm leading-6 text-cyan-50 outline-none placeholder:text-cyan-100/45"
                />
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={isPending || input.trim().length === 0}
                  onClick={() => {
                    void submitMessage();
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-200/35 bg-gradient-to-br from-cyan-300/25 to-blue-400/20 text-cyan-100 transition hover:border-cyan-100/50 disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M4 12L20 4L14 20L11 13L4 12Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
