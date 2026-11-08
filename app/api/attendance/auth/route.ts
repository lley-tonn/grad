import { NextRequest, NextResponse } from "next/server";
import { createAttendanceSession, matchesAdminPassword } from "@/lib/attendance-auth";

const cookieName = "attendance_session";
const sessionSeconds = 60 * 60 * 8;

export async function POST(request: NextRequest) {
  const password = process.env.ATTENDANCE_ADMIN_PASSWORD;
  const secret = process.env.ATTENDANCE_SESSION_SECRET;
  if (!password || password.length < 8 || !secret || secret.length < 16) {
    return NextResponse.json({ error: "Attendance access is not configured yet." }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (typeof body.password !== "string" || !matchesAdminPassword(body.password, password)) {
      return NextResponse.json({ error: "That password doesn't match." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, createAttendanceSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: sessionSeconds
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Please try again." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
