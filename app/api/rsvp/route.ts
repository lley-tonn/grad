import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "RSVP storage is not connected yet. Please contact the host directly." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const allowed = ["attending", "not_attending", "maybe"];
    if (!allowed.includes(body.status) || typeof body.guest_name !== "string" || !body.guest_name.trim() || typeof body.guest_id !== "string" || !body.guest_id.trim()) {
      return NextResponse.json({ error: "Please provide a valid RSVP." }, { status: 400 });
    }

    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { error } = await supabase.from("graduation_rsvps").insert({
      guest_name: body.guest_name.slice(0, 120),
      guest_id: body.guest_id.slice(0, 80),
      status: body.status,
      phone: typeof body.phone === "string" ? body.phone.slice(0, 40) : null,
      note: typeof body.note === "string" ? body.note.slice(0, 500) : null
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "We couldn't save your RSVP. Please try again." }, { status: 500 });
  }
}
