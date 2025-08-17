import styles from "../chatHome.module.css";
import ChatInterface from "@/app/_components/ChatInterface/ChatInterface";

interface ThreadProps {
  params: Promise<{
    thread_id: string;
  }>;
}
const Chatpage = async ({ params }: ThreadProps) => {
  const { thread_id } = await params;
  return (
    <section className={styles.container}>
      <ChatInterface thread_id={thread_id} />
    </section>
  );
};

export default Chatpage;
