import { NextResponse } from "next/server";
import { matchesInvitedGuests } from "@/lib/guest-list";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 500) {
      return NextResponse.json({ error: "Please enter the name on your invitation." }, { status: 400 });
    }

    if (!matchesInvitedGuests(body.name)) {
      return NextResponse.json({ error: "We couldn't find that name on the guest list. Please check the spelling or contact the host." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "We couldn't check the guest list. Please try again." }, { status: 400 });
  }
}
