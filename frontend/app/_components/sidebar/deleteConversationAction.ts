"use server";

import { verifySession } from "@/app/_lib/session";
import { cookies } from "next/headers";

export async function deleteConversationAction(thread_id: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const session = verifySession(token);
    const API = process.env.DOCKER_BACKEND_URL;
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "auth_token=; Path=/; HttpOnly; Max-Age=0",
        },
      });
    }
    console.log("thread_id --> /llm/delete-conversation", thread_id);

    const response = await fetch(`${API}/llm/delete-conversation`, {
      method: "POST",
      body: JSON.stringify({ thread_id: thread_id }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Chat API (get thread ids) Error:", error);
    throw error;
  }
}
