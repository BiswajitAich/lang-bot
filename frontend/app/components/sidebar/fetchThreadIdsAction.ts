"use server";

import { verifySession } from "@/app/lib/session";
import { cookies } from "next/headers";

export async function fetchThreadIdsAction(row_index: number) {
  console.log("fetchThreadIdsAction called");
  const API = process.env.DOCKER_BACKEND_URL;
  try {
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

    console.log("---------API-------", API, {
      user_id: session.id,
      row_index: row_index,
    });

    const response = await fetch(`${API}/llm/get-thread-ids`, {
      method: "POST",
      body: JSON.stringify({ user_id: session.id, row_index: row_index }),
      headers: { "Content-Type": "application/json" },
      next: {
        revalidate: 30,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()).thread_ids;
  } catch (error) {
    console.error("Chat API (get thread ids) Error:", error);
    throw error;
  }
}
