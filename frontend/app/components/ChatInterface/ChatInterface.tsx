"use client";
import { useState, useRef, useEffect } from "react";
import styles from "./ChatInterface.module.css";
import { chatConversationHistoryAction } from "./chatConversationHistoryAction";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchStartConversationAction } from "./fetchStartConversationAction";

interface Message {
  content: string;
  role: "user" | "assistant";
}

export default function ChatInterface({ thread_id }: { thread_id: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const isNewChat = searchParams.get("new_chat") === "true";
  const isReturning = searchParams.get("returning") === "true";
  const router = useRouter();
  const [called, setCalled] = useState<boolean>(false);
  let controller: AbortController;
  const fetchLLMConversation = async (user_input: string) => {
    setInputValue("");
    setIsTyping(true);
    console.log("/api/initial_llm_response", {
      user_input: user_input,
      thread_id: thread_id,
    });

    const res = await fetch("/api/initial_llm_response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_input: user_input,
        thread_id: thread_id,
      }),
      signal: controller.signal,
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
      },
    ]);
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        updated[lastIndex] = {
          ...updated[lastIndex],
          content: updated[lastIndex].content + chunk,
        };

        return updated;
      });
    }

    setIsTyping(false);
  };

  const fetchConversation = async (): Promise<string> => {
    const conversations = await fetchStartConversationAction(thread_id);

    if (!Array.isArray(conversations) || conversations.length === 0) {
      console.warn("No conversation found for thread:", thread_id);
      return "";
    }

    const firstMsg = conversations[0];
    const newMessage: Message = {
      content: firstMsg.content,
      role: firstMsg.role,
    };
    setMessages((prev) => [...prev, newMessage]);

    return newMessage.content;
  };

  useEffect(() => {
    if (isNewChat && !called) {
      setCalled(true);
      fetchConversation().then((startMessage: string) => {
        if (startMessage.trim() !== "") {
          router.replace(`/chat/${thread_id}`);
          controller = new AbortController();
          fetchLLMConversation(startMessage);
        } else {
          console.warn("Skipping LLM call: empty start message");
        }
      });
    }
  }, [isNewChat, thread_id, called]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function fetchConversation() {
      try {
        const conversations = await chatConversationHistoryAction(
          thread_id,
          isReturning,
          0
        );
        console.log(conversations);

        setMessages(conversations);

        if (isReturning) {
          router.replace(`/chat/${thread_id}`);
        }
      } catch (error) {
        console.log("Conversation fetch failed:", error);
      }
    }

    if (thread_id) {
      fetchConversation();
    }
  }, [thread_id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    const userMessage: Message = {
      content: inputValue.trim(),
      role: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
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

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    setMessages((prev) => [
      ...prev,
      {
        content: "",
        role: "assistant",
      },
    ]);

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        updated[lastIndex] = {
          ...updated[lastIndex],
          content: updated[lastIndex].content + chunk,
        };

        return updated;
      });
    }

    setIsTyping(false);
  };

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
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`${styles.messageWrapper} ${
                message.role === "user" ? styles.userMessage : styles.botMessage
              }`}
            >
              <div className={styles.messageContent}>
                <Markdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </Markdown>
              </div>
            </div>
          ))}

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
