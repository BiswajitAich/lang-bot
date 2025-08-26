"use client";
import { useState, useRef, useEffect, memo, useCallback } from "react";
import styles from "./ChatInterface.module.css";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Message {
  content: string;
  role: "user" | "assistant";
}

export default function ChatInterface({ thread_id }: { thread_id: string }) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const isNewChat = searchParams.get("n") === "true";
  const parent_id = searchParams.get("p") || null;
  const router = useRouter();
  const controllerRef = useRef<AbortController | null>(null);
  const [cachedMessages, setCachedMessages] = useState<Message[]>([]);
  const LOCAL_STORAGE_KEY = "chat_threads_cache";

  function saveMessagesToCache(thread_id: string, messages: Message[]) {
    if (typeof window === "undefined") return;
    const existing = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
    );
    existing[thread_id] = messages.slice(-10);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  }

  function loadMessagesFromCache(thread_id: string): Message[] {
    if (typeof window === "undefined") return [];
    const existing = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
    );
    return existing[thread_id] || [];
  }

  const fetchInitialQueryFn = useCallback(async (): Promise<{
    messages: Message[];
    redirect?: string;
  }> => {
    const cachedMessages = loadMessagesFromCache(thread_id);
    if (cachedMessages.length > 0 && !isNewChat) {
      return { messages: cachedMessages };
    }

    if (isNewChat) {
      const msgs = await fetchStartConversation();
      if (msgs.length === 1) {
        fetchLLMConversation(msgs[0].content);
        return { messages: msgs, redirect: `/chat/${thread_id}` };
      }
      return { messages: [], redirect: "/chat" };
    }

    controllerRef.current = new AbortController();

    const res = await fetch("/api/get_conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: thread_id, last_index: 0 }),
      signal: controllerRef.current.signal,
    });

    let conversations;
    try {
      conversations = await res.json();
    } catch (err) {
      console.error("Failed to parse JSON:", err);
      conversations = { messages: [] };
    }

    return { messages: conversations.messages ?? [] };
  }, [thread_id, isNewChat]);

  const { data } = useQuery({
    queryKey: [thread_id],
    initialData: { messages: cachedMessages },
    queryFn: fetchInitialQueryFn,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(() => {
    if (data?.messages?.length) {
      saveMessagesToCache(thread_id, data.messages);
    }
  }, [data?.messages, thread_id]);
  useEffect(() => {
    const messages = loadMessagesFromCache(thread_id);
    setCachedMessages(messages);
  }, [thread_id]);
  useEffect(() => {
    if (data?.redirect) {
      router.replace(data.redirect);
    }
  }, [data, router]);

  const streamAssistantResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) => {
    const decoder = new TextDecoder();
    queryClient.setQueryData<{ messages: Message[] }>([thread_id], (old) => ({
      messages: [...(old?.messages ?? []), { role: "assistant", content: "" }],
    }));

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      queryClient.setQueryData<{ messages: Message[] }>([thread_id], (old) => {
        if (!old) return { messages: [] };
        const updated = [...old.messages];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: updated[lastIndex].content + chunk,
        };
        return { messages: updated };
      });
    }
  };

  const fetchLLMConversation = async (user_input: string) => {
    setInputValue("");
    setIsTyping(true);
    controllerRef.current = new AbortController();

    const res = await fetch("/api/initial_llm_response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_input: user_input,
        thread_id: thread_id,
        parent_id: parent_id,
      }),
      signal: controllerRef.current.signal,
    });
    if (!res.body) return;
    await streamAssistantResponse(res.body.getReader());

    setIsTyping(false);
  };

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const fetchStartConversation = async (): Promise<Message[]> => {
    const res = await fetch("/api/fetch_start_conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id }),
    });
    const conversations = await res.json();
    console.log("fetch_start_conversation", conversations);

    return conversations.messages || [];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [data?.messages]);

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!inputValue.trim()) return;

      const userMessage: Message = {
        content: inputValue.trim(),
        role: "user",
      };

      queryClient.setQueryData<{ messages: Message[] }>([thread_id], (old) => ({
        messages: [...(old?.messages ?? []), userMessage],
      }));

      setInputValue("");
      setIsTyping(true);

      const res = await fetch("/api/continue_llm_response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: inputValue,
          thread_id: thread_id,
        }),
      });

      if (!res.body) return;
      await streamAssistantResponse(res.body.getReader());

      setIsTyping(false);
    },
    [inputValue, thread_id]
  );

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.botInfo}>
          <div className={styles.botAvatar}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L13.09 8.26L19 7L14.74 12L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12L5 7L10.91 8.26L12 2Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className={styles.botDetails}>
            <h3>AI Assistant</h3>
            <span className={styles.onlineStatus}>Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        <div className={styles.messagesList}>
          <DisplayMessages messages={data?.messages ?? []} />
          {isTyping && (
            <div className={`${styles.messageWrapper} ${styles.botMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className={styles.inputContainer}>
        <form onSubmit={handleSendMessage} className={styles.inputForm}>
          <div className={styles.inputWrapper}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className={styles.messageInput}
              disabled={isTyping}
              maxLength={100}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!inputValue.trim() || isTyping}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const DisplayMessages = memo(({ messages }: { messages: Message[] }) => {
  return (
    <>
      {messages.map((message, idx) => (
        <div
          key={idx}
          className={`${styles.messageWrapper} ${
            message.role === "user" ? styles.userMessage : styles.botMessage
          }`}
        >
          <div className={styles.messageContent}>
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          </div>
        </div>
      ))}
    </>
  );
});
