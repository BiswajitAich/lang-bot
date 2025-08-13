import { verifySession } from "@/app/lib/session";
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

  const { user_input, thread_id } = await req.json();

  const fastapiRes = await fetch(`${API}/llm/continue-llm-response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_input: user_input, thread_id: thread_id }),
  });

  console.log({ user_input, thread_id });

  return new Response(fastapiRes.body, {
    status: fastapiRes.status,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
