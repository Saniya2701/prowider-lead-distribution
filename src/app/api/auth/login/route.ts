import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { signToken } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return err("Invalid input", 400, parsed.error.flatten());

    await connectDB();
    const user = await User.findOne({ email: parsed.data.email }).select("+password");
    if (!user) return err("Invalid credentials", 401);

    const valid = await user.comparePassword(parsed.data.password);
    if (!valid) return err("Invalid credentials", 401);

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = ok({ token, email: user.email, role: user.role });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("[Auth] Login error:", e);
    return err("Internal server error", 500);
  }
}
