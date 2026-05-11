import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const ADMIN_COOKIE = "admin_session";

export async function verifyAdminSession(): Promise<{ admin_id: string; username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as { admin_id: string; username: string };
  } catch {
    return null;
  }
}
