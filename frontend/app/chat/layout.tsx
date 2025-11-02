import Sidebar from "../_components/sidebar/Sidebar";
// import ReactQueryProvider from "../_lib/ReactQueryProvider";
import styles from "./chatHome.module.css";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className={styles.layout}>
      {/* <ReactQueryProvider> */}
        <Sidebar />
        <section className={styles.content}>{children}</section>
      {/* </ReactQueryProvider> */}
    </main>
  );
}
