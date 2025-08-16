"use server";
import { verifySession } from "@/app/lib/session";
import { cookies } from "next/headers";

export const chatHomeInterfaceAction = async (formData: FormData) => {
  try {
    const init_msg = formData.get("init_msg");
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const session = verifySession(token);

    if (!session) {
      cookieStore.set("auth_token", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });
      return { error: "Unauthorized", thread_id: null, parent_id: null };
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
    const data = await response.json();
    console.log("😁", data);

    return {
      thread_id: data.thread_id,
      parent_id: data.parent_id,
    };
  } catch (error) {
    console.error("Chat API (get Conversation) Error:", error);
    throw error;
  }
};
