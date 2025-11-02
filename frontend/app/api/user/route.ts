import { verifySession } from "@/app/_lib/session";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value || "";
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

  return new Response(JSON.stringify(session), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
