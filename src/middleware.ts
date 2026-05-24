import { NextRequest, NextResponse } from "next/server";

// Public routes that don't require auth
const PUBLIC_PATHS = [
  "/",
  "/request-service",
  "/dashboard",
  "/test-tools",
  "/login",
  "/api/leads",
  "/api/webhook",
  "/api/auth/login",
  "/api/socket",
  "/api/providers",
  "/api/allocation",
  "/api/webhook/reset-quota",
];

export function middleware(_req: NextRequest) {
  // All routes are currently public for this assignment.
  // To add auth protection, uncomment and customize below:
  //
  // const path = req.nextUrl.pathname;
  // const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
  // if (!isPublic) {
  //   const token = req.cookies.get("auth-token")?.value;
  //   if (!token || !verifyToken(token)) {
  //     return NextResponse.redirect(new URL("/login", req.url));
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Suppress unused warning
void PUBLIC_PATHS;
