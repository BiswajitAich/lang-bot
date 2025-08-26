import { verifySession } from "@/app/_lib/session";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value || "";
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

  const { thread_id, last_index } = await req.json();
  console.log("🍀🍀🍀🍀🍀llm/get-conversation", { thread_id, last_index });

  const fastapiRes = await fetch(`${API}/llm/get-conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ thread_id: thread_id, last_index: last_index }),
  });

  const data = await fastapiRes.json();
  console.log(data);

  return new Response(JSON.stringify({ messages: data.conversations ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
