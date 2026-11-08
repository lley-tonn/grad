import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatchedGuests } from "@/lib/guest-list";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 500 || (body.message !== undefined && (typeof body.message !== "string" || body.message.length > 500))) {
      return NextResponse.json({ error: "Please enter the name on your invitation." }, { status: 400 });
    }
    const allowedStatuses = ["attending", "maybe", "not_attending"];
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Please choose an attendance response." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Attendance confirmation is temporarily unavailable. Please contact the host." }, { status: 503 });
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data: guests, error: guestError } = await supabase.from("graduation_guests").select("id,full_name");
    if (guestError) throw guestError;
    const matchedNames = getMatchedGuests(body.name, (guests ?? []).map(guest => guest.full_name));
    if (!matchedNames.length) {
      return NextResponse.json({ error: "We couldn't find one clear match. Please check the spelling and enter enough of the name to identify one guest." }, { status: 404 });
    }

    const idsByName = new Map((guests ?? []).map(guest => [guest.full_name, guest.id]));
    const respondedAt = new Date().toISOString();
    const { error } = await supabase.from("graduation_attendance").upsert(
      matchedNames.map(fullName => ({ guest_id: idsByName.get(fullName), status: body.status, confirmed_at: body.status === "attending" ? respondedAt : null, updated_at: respondedAt, guest_message: body.message?.trim() || null })),
      { onConflict: "guest_id" }
    );
    if (error) throw error;
    return NextResponse.json({ success: true, guests: matchedNames, status: body.status });
  } catch {
    return NextResponse.json({ error: "We couldn't check the guest list. Please try again." }, { status: 400 });
  }
}
