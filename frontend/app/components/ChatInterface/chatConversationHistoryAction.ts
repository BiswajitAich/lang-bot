"use server";

import { verifySession } from "@/app/lib/session";
import { cookies } from "next/headers";

export const chatConversationHistoryAction = async (
  threadId: string,
  isReturning: boolean,
  last_index: number
) => {
  try {
    const API = process.env.DOCKER_BACKEND_URL;
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const session = verifySession(token);

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "auth_token=; Path=/; HttpOnly; Max-Age=0",
        },
      });
    }
    const fetchOptions: RequestInit = {
      method: "POST",
      body: JSON.stringify({ thread_id: threadId, last_index }),
      headers: { "Content-Type": "application/json" },
    };

    if (isReturning) {
      fetchOptions.next = { revalidate: 60 };
    } else {
      fetchOptions.cache = "reload";
    }

    const response = await fetch(`${API}/llm/get-conversation`, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()).conversations;
  } catch (error) {
    console.error("Chat API (get Conversation) Error:", error);
    throw error;
  }
};
