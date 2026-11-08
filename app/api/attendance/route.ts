import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAttendanceSessionValid } from "@/lib/attendance-auth";
import { normalizeGuestName } from "@/lib/guest-list";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAttendanceSessionValid(request.cookies.get("attendance_session")?.value)) {
    return NextResponse.json({ error: "Please sign in to view attendance." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Attendance storage is not configured yet." }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const [{ data: guests, error: guestError }, { data: attendance, error: attendanceError }] = await Promise.all([
    supabase.from("graduation_guests").select("id,full_name").order("full_name"),
    supabase.from("graduation_attendance").select("guest_id,status,guest_message,confirmed_at,updated_at")
  ]);
  if (guestError || attendanceError) return NextResponse.json({ error: "We couldn't load the attendance list." }, { status: 500 });

  const attendanceById = new Map((attendance ?? []).map(row => [row.guest_id, row]));
  return NextResponse.json({ guests: (guests ?? []).map(guest => {
    const response = attendanceById.get(guest.id);
    return { id: guest.id, name: guest.full_name, status: response?.status ?? "pending", message: response?.guest_message ?? "", respondedAt: response && response.status !== "pending" ? (response.updated_at ?? response.confirmed_at) : null };
  }) });
}

export async function PATCH(request: NextRequest) {
  if (!isAttendanceSessionValid(request.cookies.get("attendance_session")?.value)) {
    return NextResponse.json({ error: "Please sign in to manage attendance." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) return NextResponse.json({ error: "Attendance storage is not configured yet." }, { status: 503 });

  try {
    const body = await request.json();
    const allowedStatuses = ["pending", "attending", "not_attending", "maybe"];
    if (typeof body.id !== "string" || typeof body.name !== "string" || !body.name.trim() || body.name.length > 120 || !allowedStatuses.includes(body.status) || typeof body.message !== "string" || body.message.length > 500) {
      return NextResponse.json({ error: "Please check the guest details and try again." }, { status: 400 });
    }

    const supabase = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const fullName = body.name.trim().replace(/\s+/g, " ");
    const { data: updatedGuest, error: guestError } = await supabase.from("graduation_guests")
      .update({ full_name: fullName, normalized_name: normalizeGuestName(fullName) })
      .eq("id", body.id)
      .select("id")
      .single();
    if (guestError || !updatedGuest) return NextResponse.json({ error: "We couldn't update that guest name." }, { status: 409 });

    const now = new Date().toISOString();
    const attending = body.status === "attending";
    const { error: attendanceError } = await supabase.from("graduation_attendance").upsert({
      guest_id: body.id,
      status: body.status,
      confirmed_at: attending ? now : null,
      updated_at: now,
      guest_message: body.message.trim() || null
    }, { onConflict: "guest_id" });
    if (attendanceError) return NextResponse.json({ error: "The guest name was updated, but the attendance response could not be saved." }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "We couldn't update the guest. Please try again." }, { status: 400 });
  }
}
