import { verifySession } from "@/app/_lib/session";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value || "";
  const session = verifySession(token);

  const headers = {
    "Content-Type": "application/json",
    "Set-Cookie":
      "auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
  };

  if (session) {
    return new Response(
      JSON.stringify({ message: "Successfully logged out" }),
      { status: 200, headers }
    );
  }


  return new Response(JSON.stringify({ message: "No active session" }), {
    status: 200,
    headers,
  });
}
