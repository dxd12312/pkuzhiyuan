import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const ADMIN_COOKIE = "admin_session";

export async function verifyAdminSession(): Promise<{ admin_id: string; username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as { admin_id: string; username: string };
  } catch {
    return null;
  }
}
