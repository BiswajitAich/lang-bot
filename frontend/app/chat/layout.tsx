import Sidebar from "../components/sidebar/Sidebar";
import styles from "./chatHome.module.css";
import { fetchThreadIdsAction } from "@/app/components/sidebar/fetchThreadIdsAction";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialThreadIds = await fetchThreadIdsAction(0);
  return (
    <main className={styles.layout}>
      <Sidebar thread_ids={initialThreadIds} />
      <section className={styles.content}>{children}</section>
    </main>
  );
}
