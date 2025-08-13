import { NextResponse, type NextRequest } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp && Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get("auth_token")?.value;

  const publicRoutes = ["/auth"];
  const isPublicRoute = publicRoutes.includes(pathname);

  const hasValidToken = authToken && !isTokenExpired(authToken);
  console.log("hasValidToken", hasValidToken);

  if (isPublicRoute && hasValidToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicRoute && !hasValidToken) {
    const response = NextResponse.redirect(new URL("/auth", request.url));
    console.log("response.cookies.delete(auth_token);");

    response.cookies.delete("auth_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/auth"],
};
