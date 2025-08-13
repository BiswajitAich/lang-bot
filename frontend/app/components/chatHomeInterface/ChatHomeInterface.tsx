"use client";
import { useRouter } from "next/navigation";
import styles from "./chatHomeInterface.module.css";
import { chatHomeInterfaceAction } from "./chatHomeInterfaceAction";
const ChatHomeInterface = () => {
  const router = useRouter();
  async function handleSubmit(data: FormData) {
    if (!data.get("init_msg")?.toString().trim()) return;
    const thread_id = await chatHomeInterfaceAction(data);
    router.push(`/chat/${thread_id}?new_chat=true`);
  }
  return (
    <div className={styles.display}>
      <form action={handleSubmit} className={styles.chatForm}>
        <input
          type="text"
          min={1}
          max={1000}
          placeholder="Start Conversation..."
          name="init_msg"
          className={styles.messageInput}
        />
        <button type="submit" className={styles.startButton}>
          Start Chat
          <span className={styles.chatIcon}>💬</span>
        </button>
      </form>
    </div>
  );
};

export default ChatHomeInterface;
