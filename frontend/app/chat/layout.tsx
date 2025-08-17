import { Suspense } from "react";
import Sidebar from "../_components/sidebar/Sidebar";
import styles from "./chatHome.module.css";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className={styles.layout}>
      <Suspense>
        <Sidebar />
        <section className={styles.content}>{children}</section>
      </Suspense>
    </main>
  );
}
