# Lleyton Adrian — The Next Chapter

A premium, Apple-inspired digital graduation invitation for 12 November 2026.

## Included
- Responsive invitation website
- Guest-personalised greeting via `?guest=Name&id=GUEST-001`
- Live countdown to the configured event time
- Graduation journey timeline
- RSVP modal with attending / maybe / unable to attend
- Supabase-backed RSVP API route
- Password-protected attendance dashboard at `/attendance`
- Downloadable QR code and copyable invitation link
- Hidden developer terminal with Easter-egg commands
- WhatsApp-ready personalised links

## 1. Requirements
- Node.js 20.9+
- npm
- A Supabase project (for saving RSVPs)
- A deployed URL (Vercel is recommended)

## 2. Install and run
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

## 3. Confirmed event details
The project is configured for Thursday, 12 November 2026 at 6:00 PM EAT. Guest arrival is 5:45 PM at Fairway Hotel, Kafu Road, Kampala. Dress code: Smart casual. RSVP deadline: 11 November 2026. Both WhatsApp contacts are displayed in the footer. Update `lib/config.ts` if any detail changes. The uploaded graduation portrait is stored at `public/graduation-portrait.jpg`.

## 4. Guest RSVP behaviour
Guests confirm by entering a name from the Supabase `graduation_guests` roster. The server matches the name, then upserts one `graduation_attendance` row per matched guest. Partial names are accepted only when they uniquely identify a guest; ambiguous names need more identifying words. Multiple names can be separated by commas or new lines.

## 5. Connect RSVP storage
1. Create a Supabase project.
2. For a new project, open the SQL Editor and run `supabase/schema.sql`. For an existing project, run `supabase/migrations/202611080001_guest_roster_and_attendance.sql` followed by `supabase/migrations/202611080002_guest_messages_and_host_controls.sql`. The migrations seed the 11 invited names, preserve matching prior RSVP responses, and add private guest messages and host-managed response states.
3. Copy the project URL and anon key into `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
ATTENDANCE_ADMIN_PASSWORD=CHOOSE_A_PRIVATE_PASSWORD
ATTENDANCE_SESSION_SECRET=CHOOSE_A_LONG_RANDOM_SECRET
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
4. Restart the dev server. Keep the Supabase secret key and attendance secrets private; never add a `NEXT_PUBLIC_` prefix to them.
5. Open `/attendance` and sign in with `ATTENDANCE_ADMIN_PASSWORD`. The session expires after eight hours. The dashboard reads the guest roster and attendance tables using the service-role key; guests cannot access this page's data.
6. Guest confirmations are remembered on the guest's device. On `/attendance`, you can correct guest names, update their response, and read or edit optional messages.

The guest and attendance tables have row-level security enabled and no public read/write policies. Server routes access them with `SUPABASE_SECRET_KEY`; keep that key private. The legacy `graduation_rsvps` table remains for older RSVP submissions.

## 5. Personalised WhatsApp links
Use this URL format:
```text
https://YOUR-DOMAIN.com/?guest=Jane%20Doe&id=GUEST-001
```
Example message:
> Hi Jane, I'd love you to join me as I celebrate my graduation. I've made a little digital invitation for you: https://YOUR-DOMAIN.com/?guest=Jane%20Doe&id=GUEST-001

The guest name is displayed on the page and stored with their RSVP. Generate a unique ID for each guest so responses can be associated with the invitation.

## 6. Deploy to Vercel
1. Push this project to a private or public GitHub repository.
2. Import the repository into Vercel.
3. Add the three environment variables in Vercel project settings.
4. Deploy and test the production RSVP flow.
5. Set `NEXT_PUBLIC_SITE_URL` to your final domain.

## 7. Easter egg terminal
Open the terminal from the footer and try:
- `help`
- `about`
- `details`
- `journey`
- `rsvp`
- `celebrate`
- `clear`

## Before sharing
- Confirm ceremony venue and start time.
- Replace any placeholder details.
- Add a real graduation portrait / approved photography if desired.
- Connect Supabase and test RSVP submissions.
- Deploy and test on iPhone Safari and Android Chrome.
- Generate a personalised link for each guest.
- Test QR code scanning from another device.

## Design notes
The visual system uses a restrained charcoal / warm-white / orange palette, generous spacing, editorial typography, glass-like navigation and restrained motion. The result is intentionally premium rather than cyberpunk.
