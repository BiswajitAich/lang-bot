"use server";
import { verifySession } from "@/app/lib/session";
import { cookies } from "next/headers";

export const chatHomeInterfaceAction = async (data: FormData) => {
  try {
    const init_msg = data.get("init_msg");
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

    console.log("Session from verifySession:", session);
    console.log("init_msg:", init_msg);
    const API = process.env.DOCKER_BACKEND_URL;
    const response = await fetch(`${API}/llm/new-thread`, {
      method: "POST",
      body: JSON.stringify({
        user_id: Number(session.id),
        init_msg: init_msg,
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()).thread_id;
  } catch (error) {
    console.error("Chat API (get Conversation) Error:", error);
    throw error;
  }
};
