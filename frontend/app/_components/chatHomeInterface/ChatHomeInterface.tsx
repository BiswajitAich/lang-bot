"use client";
import styles from "./chatHomeInterface.module.css";
import { useThreads } from "@/app/_lib/hooks";

const ChatHomeInterface = () => {
  const { addNewThread } = useThreads();
  async function handleSubmit(data: FormData) {
    if (!data.get("init_msg")?.toString().trim()) return;
    addNewThread(data);
  }
  return (
    <div className={styles.display}>
      <form action={handleSubmit} className={styles.chatForm}>
        <input
          type="text"
          minLength={1}
          maxLength={1000}
          placeholder="Start Conversation..."
          name="init_msg"
          className={styles.messageInput}
        />
        <button type="submit" className={styles.startButton}>
          Start Chat
          <span className={styles.chatIcon} />
        </button>
      </form>
    </div>
  );
};

export default ChatHomeInterface;
