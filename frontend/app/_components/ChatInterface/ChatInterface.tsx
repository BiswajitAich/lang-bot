"use client";
import { useState, useRef, useEffect, memo, useCallback } from "react";
import styles from "./ChatInterface.module.css";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
const MAX_LENGTH = 200;
const LOCAL_STORAGE_KEY = "chat_threads_cache";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  images?: Array<{
    role: string;
    url_id: string;
    description: string;
    created_at: string;
  }>;
}
interface MessagesState {
  messages: Message[];
  has_more: boolean;
}

function saveMessagesToCache(thread_id: string, messages: MessagesState) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
    );
    existing[thread_id] = messages;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error("Failed to save to cache:", error);
  }
}

function loadMessagesFromCache(thread_id: string) {
  if (typeof window === "undefined") return null;

  try {
    console.log("---loadMessagesFromCache---");

    const existing = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
    );
    const cached = existing[thread_id];
    if (
      !cached ||
      typeof cached !== "object" ||
      !Array.isArray(cached.messages) ||
      typeof cached.has_more !== "boolean" ||
      cached.messages.length === 0
    ) {
      return null;
    }
    return cached as MessagesState;
  } catch (error) {
    console.error("Failed to load from cache:", error);
    return null;
  }
}

export default function ChatInterface({ thread_id }: { thread_id: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const isNewChat = searchParams.get("n") === "true";
  const parent_id = searchParams.get("p") || null;
  const router = useRouter();
  const conversationControllerRef = useRef<AbortController | null>(null);
  const llmControllerRef = useRef<AbortController | null>(null);

  function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    );
  }
  const fetchFreshConversation = async (
    created_at: string | null = null
  ): Promise<MessagesState> => {
    if (!thread_id || !isValidUUID(thread_id)) {
      router.replace(`/chat?error=${encodeURIComponent("invalid_thread_id")}`);
      throw new Error("⚠️ Invalid chat id!");
      // return { messages: [], has_more: false };
    }
    try {
      conversationControllerRef.current = new AbortController();
      const body = {
        thread_id,
        ...(created_at ? { created_at } : {}),
      };
      const res = await fetch("/api/get_conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: conversationControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const { data } = await res.json();
      // console.log(data);

      if (!data?.messages?.length) {
        router.replace(`/chat?error=${encodeURIComponent("fetch_failed")}`);
        return { messages: [], has_more: false };
      }

      // Merge with existing cached messages if exists

      let mergedMessages: Message[];
      const currentCache = loadMessagesFromCache(thread_id);
      if (currentCache) {
        // Pagination
        mergedMessages = [...data.messages, ...(currentCache?.messages || [])];
      } else {
        // Initial fetch: replace
        mergedMessages = data.messages;
      }

      const mergedData: MessagesState = {
        messages: mergedMessages,
        has_more: data.has_more ?? false,
      };
      saveMessagesToCache(thread_id, mergedData);
      return mergedData;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("🤨Request was aborted");
      } else {
        throw new Error("🤖Failed to fetch conversation:");
      }
      // return { messages: [], has_more: false };
    }
  };

  const fetchInitialQueryFn = useCallback(async (): Promise<MessagesState> => {
    console.log("🥇🥇🥇fetchInitialQueryFn");
    if (!thread_id || !isValidUUID(thread_id)) {
      router.replace(`/chat?error=${encodeURIComponent("invalid_thread_id")}`);
      throw new Error("⚠️ Invalid chat id!");
    }
    const cache = loadMessagesFromCache(thread_id);

    if ((!cache || !cache.messages.length) && isNewChat) {
      console.log("🆕 New chat with no cache");
      const apiData = await fetchFreshConversation();
      const content = apiData.messages[0].content;
      console.log(content);
      if (content) {
        fetchLLMConversation(content);
        router.replace(`/chat/${thread_id}`);
        // cache?.messages.push()
        return apiData;
      }
    }

    if (cache?.messages.length && !isNewChat) {
      console.log("Using cached messages, no API call needed");
      return cache;
    }

    // No cache
    console.log("No cache found, fetching from API");
    const apiData = await fetchFreshConversation();
    return apiData;
  }, [thread_id, isNewChat]);

  const { data } = useQuery({
    queryKey: [thread_id],
    // initialData: () => {
    //   const cache = loadMessagesFromCache(thread_id);
    //   return cache || { messages: [], has_more: false };
    // },
    placeholderData: { messages: [], has_more: false },
    queryFn: fetchInitialQueryFn,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // don't refetch on mount
    staleTime: Infinity, // Data never goes stale
    gcTime: Infinity, // Keep in memory forever
    retry: false,
  });

  useEffect(() => {
    if (data?.messages?.length) {
      saveMessagesToCache(thread_id, data);
    }
  }, [data, thread_id]);

  // useEffect(() => {
  //   if (data?.redirect) {
  //     router.replace(data.redirect);
  //   }
  // }, [data, router]);

  const streamAssistantResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) => {
    const decoder = new TextDecoder();
    queryClient.setQueryData<MessagesState>([thread_id], (old) => ({
      messages: [
        ...(old?.messages ?? []),
        { role: "assistant", content: "", created_at: "" },
      ],
      has_more: old?.has_more ?? false,
    }));

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        queryClient.setQueryData<MessagesState>([thread_id], (old) => {
          if (!old) return { messages: [], has_more: false };
          const updated = [...old.messages];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + chunk,
            };
          }
          return { messages: updated, has_more: old.has_more };
        });
      }
      const finalData = queryClient.getQueryData<MessagesState>([thread_id]);
      if (finalData && finalData.messages.length > 0) {
        const last = finalData.messages[finalData.messages.length - 1];
        if (
          last.role === "assistant" &&
          last.content.startsWith("🛠️") &&
          last.content.includes("https://res.cloudinary.com/")
        ) {
          console.log("🐦‍🔥 image present");
          const refreshed = await fetchFreshConversation();
          queryClient.setQueryData<MessagesState>([thread_id], (old) => {
            if (!old) return refreshed;

            const updated = [...old.messages];
            const lastIndex = updated.length - 1;

            const refreshedLastMessage =
              refreshed.messages[refreshed.messages.length - 1];
            if (lastIndex >= 0 && refreshedLastMessage) {
              updated[lastIndex] = refreshedLastMessage;
            }
            const existingIds = new Set(updated.map((m) => m.id || m.content));

            const additional = refreshed.messages.filter(
              (m) => !existingIds.has(m.id || m.content)
            );

            const mergedState = {
              ...refreshed,
              messages: [...updated, ...additional],
            };

            saveMessagesToCache(thread_id, mergedState);
            return mergedState;
          });
        }
      }
    } catch (error) {
      console.error("Stream reading error:", error);
    } finally {
      reader.releaseLock();
    }
  };

  const fetchLLMConversation = async (user_input: string) => {
    setMessage("");
    setIsTyping(true);

    // Abort previous request if exists
    if (llmControllerRef.current) {
      llmControllerRef.current.abort();
    }
    llmControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/initial_llm_response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: user_input,
          thread_id: thread_id,
          parent_id: parent_id,
        }),
        signal: llmControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("Response body is empty");
      }

      await streamAssistantResponse(res.body.getReader());
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was aborted");
      } else {
        console.error("Failed to fetch LLM response:", error);
        // Add error message to chat
        queryClient.setQueryData<{ messages: Message[] }>(
          [thread_id],
          (old) => ({
            messages: [
              ...(old?.messages ?? []),
              {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                created_at: "",
              },
            ],
          })
        );
      }
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("n") === "true") return;
    return () => {
      if (conversationControllerRef.current) {
        conversationControllerRef.current.abort();
        conversationControllerRef.current = null;
      }
      if (llmControllerRef.current) {
        llmControllerRef.current.abort();
        llmControllerRef.current = null;
      }
    };
  }, []);

  // const fetchStartConversation = async (): Promise<Message[]> => {
  //   try {
  //     const res = await fetch("/api/fetch_start_conversation", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ thread_id }),
  //     });

  //     if (!res.ok) {
  //       throw new Error(`HTTP error! status: ${res.status}`);
  //     }

  //     const conversations = await res.json();
  //     console.log("fetch_start_conversation", conversations);
  //     return conversations.messages || [];
  //   } catch (error) {
  //     console.error("Failed to start conversation:", error);
  //     return [];
  //   }
  // };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isTyping) scrollToBottom();
  }, [data?.messages, isTyping]);

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!message.trim() || isTyping) return;

      const userMessage: Message = {
        content: message.trim(),
        role: "user",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<{ messages: Message[] }>([thread_id], (old) => ({
        messages: [...(old?.messages ?? []), userMessage],
      }));

      const messageToSend = message.trim();
      setMessage("");
      setIsTyping(true);

      // Clear input
      if (inputRef.current) {
        inputRef.current.innerText = "";
        inputRef.current.classList.add(styles.placeholder);
      }

      try {
        const res = await fetch("/api/continue_llm_response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_input: messageToSend,
            thread_id: thread_id,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        if (!res.body) {
          throw new Error("Response body is empty");
        }

        await streamAssistantResponse(res.body.getReader());
      } catch (error) {
        console.error("Failed to send message:", error);
        // Add error message to chat
        queryClient.setQueryData<{ messages: Message[] }>(
          [thread_id],
          (old) => ({
            messages: [
              ...(old?.messages ?? []),
              {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                created_at: new Date().toISOString(),
              },
            ],
          })
        );
      } finally {
        setIsTyping(false);
      }
    },
    [message, thread_id, isTyping, queryClient]
  );

  const handleInput = () => {
    if (!inputRef.current) return;
    let text = inputRef.current.innerText.replace(/\r\n/g, "\n");

    setMessage(text);

    if (!text) inputRef.current.classList.add(styles.placeholder);
    else inputRef.current.classList.remove(styles.placeholder);

    // Set max input length
    if (text.length < MAX_LENGTH) return;
    inputRef.current.innerText = text.slice(0, MAX_LENGTH);
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    if (sel && inputRef.current.childNodes.length > 0) {
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const insertTextAtCursor = (text: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move the caret after the inserted text
    range.setStartAfter(textNode);
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
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
          {data?.has_more ? (
            <LoadMoreConversation
              loadingMoreConversation
              loadConversations={() =>
                fetchFreshConversation(data?.messages[0]?.created_at)
              }
              thread_id={thread_id}
              queryClient={queryClient}
            />
          ) : null}

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
        <form onSubmit={handleSendMessage} className={styles.inputWrapper}>
          <div
            ref={inputRef}
            role="textbox"
            contentEditable
            aria-label="Send message"
            data-placeholder="Continue your message..."
            className={`${styles.messageInput} ${
              message.trim() === "" ? styles.placeholder : ""
            }`}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={(e) => {
              e.preventDefault();
              const pastedText = e.clipboardData
                .getData("text/plain")
                .replace(/\r\n/g, "\n")
                .slice(0, MAX_LENGTH - message.length);
              insertTextAtCursor(pastedText);
              handleInput();
            }}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={isTyping || !message.trim()}
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
        </form>
      </div>
    </div>
  );
}

const DisplayMessages = memo(({ messages }: { messages: Message[] }) => {
  const getCloudinaryUrl = (publicId: string): string => {
    if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
      return publicId;
    }
    // If it's an error message, return empty string
    if (publicId.startsWith("❌")) {
      return "";
    }
    const CLOUDINARY_CLOUD_NAME =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "di3zlyh9o";
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
  };

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
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {message.content}
            </Markdown>

            {/* Display images if present */}
            {message.images && message.images.length > 0 && (
              <div className={styles.imagesContainer}>
                {message.images.map((image, imgIdx) => {
                  const imageUrl = getCloudinaryUrl(image.url_id);

                  // Don't render if URL is empty (error case)
                  if (!imageUrl) return null;

                  return (
                    <div key={imgIdx} className={styles.imageWrapper}>
                      <img
                        src={imageUrl}
                        alt={image.description || "Generated image"}
                        className={styles.generatedImage}
                        loading="lazy"
                        onError={(e) => {
                          console.error("Failed to load image:", imageUrl);
                          e.currentTarget.style.display = "none";

                          // Optionally show error message
                          const wrapper = e.currentTarget.parentElement;
                          if (wrapper) {
                            const errorMsg = document.createElement("p");
                            errorMsg.textContent = "❌ Image failed to load";
                            errorMsg.style.color = "#ff4444";
                            errorMsg.style.fontSize = "14px";
                            wrapper.appendChild(errorMsg);
                          }
                        }}
                      />
                      {image.description && (
                        <p className={styles.imageCaption}>
                          {image.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
});

const LoadMoreConversation = memo(
  ({
    loadConversations,
    thread_id,
    queryClient,
  }: {
    loadingMoreConversation: boolean;
    loadConversations: () => Promise<MessagesState>;
    thread_id: string;
    queryClient: any;
  }) => {
    const [loading, setLoading] = useState(false);
    const handleLoad = async () => {
      setLoading(true);
      const olderMessagesData = await loadConversations();

      queryClient.setQueryData(
        [thread_id],
        (old: MessagesState | undefined) => {
          if (!old) return olderMessagesData;

          return {
            messages: olderMessagesData.messages,
            has_more: olderMessagesData.has_more,
          };
        }
      );
      setLoading(false);
    };

    return (
      <div>
        <button onClick={handleLoad}>
          {!loading ? "Load previous conversations" : "Loading..."}
        </button>
      </div>
    );
  }
);

DisplayMessages.displayName = "DisplayMessages";
LoadMoreConversation.displayName = "LoadMoreConversation";
