import { NextRequest, NextResponse } from "next/server";

const SURVEY_PATHS = ["/instructions", "/block", "/comprehension", "/diagnostic", "/report", "/payment"];
const ADMIN_PATHS = ["/admin/sessions", "/admin/export"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!request.cookies.get("admin_session")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (SURVEY_PATHS.some((p) => pathname.startsWith(p))) {
    if (!request.cookies.get("respondent_id")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/sessions/:path*",
    "/admin/export/:path*",
    "/instructions",
    "/block/:path*",
    "/comprehension/:path*",
    "/diagnostic",
    "/report",
    "/payment",
  ],
};
