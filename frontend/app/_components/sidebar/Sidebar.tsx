"use client";
import { memo, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./sidebar.module.css";
import Link from "next/link";
import { useThreads } from "@/app/_lib/hooks";

const Sidebar = () => {
  const { threadIds, deleteThread } = useThreads();
  const [displaySideBar, setDisplaySideBar] = useState<boolean>(false);
  const pathname = usePathname();
  const currentThreadId = pathname.split("/").pop() as string | undefined;

  return (
    <aside
      className={`${styles.sidebar} ${
        displaySideBar ? styles.sidebarExpanded : styles.sidebarCollapsed
      }`}
    >
      <button
        onClick={() => {
          setDisplaySideBar(!displaySideBar);
        }}
        className={styles.burger}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${styles.burgerIcon} ${styles.sidebarToggleIcon}`}
          viewBox="0 0 24 24"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className={styles.newChat}>
        <Link href={"/chat"} className={styles.chatLink}>
          <div className={styles.newChatButton}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className={styles.newChatIcon}
            >
              <path d="M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z" />
            </svg>
            <p className={styles.newChatText}>New Chat</p>
          </div>
        </Link>
      </div>

      <div className={styles.chatListContainer}>
        <ul className={styles.chatList}>
          {threadIds.map((id, i) => (
            <li
              key={i}
              className={`${styles.chatItem} ${
                currentThreadId === id ? styles.chatItemActive : ""
              }`}
            >
              <Link
                href={`/chat/${id}?returning=true`}
                className={styles.chatLink}
                style={{ maxWidth: "calc(100% - 40px)" }}
              >
                <p className={styles.thread}>{id}</p>
              </Link>
              <button
                className={styles.delete}
                onClick={() => deleteThread(id, currentThreadId || "")}
                aria-label={`Delete chat ${id}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={styles.deleteIcon}
                >
                  <path
                    d="M3 6H5H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        {threadIds.length === 0 && displaySideBar && (
          <div className={styles.emptyState}>No conversations yet</div>
        )}
      </div>
    </aside>
  );
};

export default memo(Sidebar);
