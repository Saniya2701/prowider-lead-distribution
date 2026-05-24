import { NextRequest, NextResponse } from "next/server";

// Socket.io is handled via the custom server (server.ts)
// This route just acknowledges the socket path is active
export async function GET(_req: NextRequest) {
  return NextResponse.json({ message: "Socket.io endpoint active. Connect via ws://" });
}
