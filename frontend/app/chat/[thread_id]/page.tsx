// import ReactQueryProvider from "@/app/_lib/ReactQueryProvider";
import styles from "../chatHome.module.css";
import ChatInterface from "@/app/_components/ChatInterface/ChatInterface";

interface ThreadProps {
  params: Promise<{
    thread_id: string;
  }>;
}
const Chatpage = async ({ params }: ThreadProps) => {
  const thread_id = (await params).thread_id;
  return (
    <section className={styles.container}>
      {/* <ReactQueryProvider> */}
      <ChatInterface thread_id={thread_id} />
      {/* </ReactQueryProvider> */}
    </section>
  );
};

export default Chatpage;
