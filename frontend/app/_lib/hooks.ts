"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchThreadIdsAction } from "../_components/sidebar/fetchThreadIdsAction";
import { deleteConversationAction } from "../_components/sidebar/deleteConversationAction";
import { useRouter } from "next/navigation";
import { chatHomeInterfaceAction } from "../_components/chatHomeInterface/chatHomeInterfaceAction";

export const useThreads = () => {
  const [threadIds, setThreadIds] = useState<string[]>([]);
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initThreads = async () => {
      setPending(true);
      try {
        const stored = localStorage.getItem("thread_ids");
        if (stored) {
          setThreadIds(JSON.parse(stored));
        } else {
          const fetched = await fetchThreadIdsAction(0);
          if (fetched?.length) {
            setThreadIds(fetched);
          }
        }
      } catch (error) {
        console.error("Failed to fetch threads:", error);
        setError("Failed to fetch threads");
      } finally {
        setPending(false);
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

      setPending(true);
      try {
        setThreadIds((prev) => {
          const updated = prev.filter((t) => t !== id);
          localStorage.setItem("thread_ids", JSON.stringify(updated));

          const cache = JSON.parse(
            localStorage.getItem("chat_threads_cache") || "{}"
          );
          delete cache[id];
          localStorage.setItem("chat_threads_cache", JSON.stringify(cache));

          return updated;
        });

        const data = await deleteConversationAction(id);
        if (!data?.success) {
          console.log("Delete failed, restoring...");
          setThreadIds((prev) => {
            const restored = [id, ...prev];
            localStorage.setItem("thread_ids", JSON.stringify(restored));
            return restored;
          });
          return;
        }

        if (currentThreadId === id) {
          router.push("/chat");
        }
      } catch (error) {
        console.error("Delete thread error:", error);
        setError("Delete failed");
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  const addNewThread = useCallback(async (data: FormData) => {
    setPending(true);
    try {
      const result = await chatHomeInterfaceAction(data);
      if (result.error) result;
      setThreadIds((prev) => {
        const updated = [result.thread_id, ...prev];
        localStorage.setItem("thread_ids", JSON.stringify(updated));
        return updated;
      });
      router.push(`/chat/${result.thread_id}?n=true&p=${result.parent_id}`);
    } catch (error) {
      console.error("Add thread error:", error);
      setError("Failed to add thread");
    } finally {
      setPending(false);
    }
  }, []);
  return {
    threadIds,
    setThreadIds,
    deleteThread,
    addNewThread,
    pending,
    error,
  };
};
