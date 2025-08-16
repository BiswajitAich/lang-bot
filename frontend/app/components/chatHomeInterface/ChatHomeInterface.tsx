"use client";
import { useRouter } from "next/navigation";
import styles from "./chatHomeInterface.module.css";
import { chatHomeInterfaceAction } from "./chatHomeInterfaceAction";
const ChatHomeInterface = () => {
  const router = useRouter();
  async function handleSubmit(data: FormData) {
    if (!data.get("init_msg")?.toString().trim()) return;
    const result = await chatHomeInterfaceAction(data);
    router.push(`/chat/${result.thread_id}?n=true&p=${result.parent_id}`);
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
