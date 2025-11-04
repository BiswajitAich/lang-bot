"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./chatHomeInterface.module.css";
import { useThreads } from "@/app/_lib/hooks";
import { useSearchParams, useRouter } from "next/navigation";
const MAX_LENGTH = 200;

const ChatHomeInterface = () => {
  const { addNewThread } = useThreads();
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errCode = params.get("error");
    if (!errCode) return;

    const errorMap: Record<string, string> = {
      invalid_thread_id: "⚠️ Unable to load conversation",
      fetch_failed: "Failed to load conversation.",
      unknown: "Something went wrong. Please try again.",
    };

    setError(decodeURIComponent(errorMap[errCode]) || null);
    router.replace("/chat");
  }, [params, router]);

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

  const handleInput = () => {
    if (!inputRef.current) return;
    let text = inputRef.current.innerText.replace(/\r\n/g, "");

    setMessage(text);

    if (!text) inputRef.current.classList.add(styles.placeholder);
    else inputRef.current.classList.remove(styles.placeholder);

    // Set max input length
    if (text.length < MAX_LENGTH) return;
    inputRef.current.innerText = text.slice(0, MAX_LENGTH);
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(inputRef.current);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("submiting message!");

    const trimmed = message.trim();
    if (!trimmed) {
      console.log("Message is empty, not submitting");
      return;
    }
    const formData = new FormData();
    formData.append("init_msg", trimmed);

    try {
      await addNewThread(formData);
      if (inputRef.current) {
        inputRef.current.innerText = "";
        inputRef.current.classList.add(styles.placeholder);
      }
      setMessage("");
      if (inputRef.current) inputRef.current.innerText = "";
    } catch (error) {
      console.error("Failed to submit message:", error);
    }

    if (inputRef.current) inputRef.current.innerText = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div>
      <div className={styles.display}>
        <div className={styles.greeting}>how can i help you today ?</div>
        <form onSubmit={handleSubmit} className={styles.chatForm}>
          <div
            role="textbox"
            contentEditable
            aria-label="Type your message"
            data-placeholder="Start Conversation..."
            ref={inputRef}
            className={`${styles.messageInput} ${
              message.trim() === "" ? styles.placeholder : ""
            }`}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            // handle on paste
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
            className={styles.startButton}
            aria-label="Submit Chat"
          >
            Start Chat
            <span className={styles.chatIcon} />
          </button>
        </form>
      </div>
      {error ? (
        <button
          aria-label="Display Error"
          onClick={() => setError(null)}
          className="error"
        >
          {error}
        </button>
      ) : null}
    </div>
  );
};

export default ChatHomeInterface;
