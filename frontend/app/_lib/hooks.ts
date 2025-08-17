"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchThreadIdsAction } from "../_components/sidebar/fetchThreadIdsAction";
import { deleteConversationAction } from "../_components/sidebar/deleteConversationAction";
import { useRouter } from "next/navigation";
import { chatHomeInterfaceAction } from "../_components/chatHomeInterface/chatHomeInterfaceAction";

export const useThreads = () => {
  const [threadIds, setThreadIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const initThreads = async () => {
      const stored = localStorage.getItem("thread_ids");
      if (stored) {
        setThreadIds(JSON.parse(stored));
      } else {
        const fetched = await fetchThreadIdsAction(0);
        if (fetched?.length) {
          setThreadIds(fetched);
        }
      }
    };
    initThreads();
  }, []);

  useEffect(() => {
    if (threadIds.length <= 0) return;
    localStorage.setItem("thread_ids", JSON.stringify(threadIds));
  }, [threadIds]);

  const deleteThread = useCallback(
    async (id: string, currentThreadId: string) => {
      if (!id) return;

      setThreadIds((prev) => {
        const updated = prev.filter((t) => t !== id);
        localStorage.setItem("thread_ids", JSON.stringify(updated));
        return updated;
      });

      const data = await deleteConversationAction(id);
      if (!data?.success) {
        console.log("Delete failed, restoring...");
        setThreadIds((prev) => {
          const restored = [...prev, id];
          localStorage.setItem("thread_ids", JSON.stringify(restored));
          return restored;
        });
        return;
      }

      if (currentThreadId === id) {
        router.push("/chat");
      }
    },
    [router]
  );

  const addNewThread = useCallback(async (data: FormData) => {
    const result = await chatHomeInterfaceAction(data);
    if (result.error) result;
    setThreadIds((prev) => {
      const updated = [...prev, result.thread_id];
      localStorage.setItem("thread_ids", JSON.stringify(updated));
      return updated;
    });
    router.push(`/chat/${result.thread_id}?n=true&p=${result.parent_id}`);
  }, []);
  return { threadIds, setThreadIds, deleteThread, addNewThread };
};
