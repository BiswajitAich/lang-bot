import jwt from "jsonwebtoken";

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  firstname: string | null;
  lastname: string | null;
}

export function verifySession(token?: string): SessionUser | null {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded.username || !decoded.email) {
      return null;
    }
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      firstname: decoded.firstname || null,
      lastname: decoded.lastname || null,
    } as SessionUser;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}
