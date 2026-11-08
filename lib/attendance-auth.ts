import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_SECONDS = 60 * 60 * 8;

function signature(timestamp: string) {
  const secret = process.env.ATTENDANCE_SESSION_SECRET;
  if (!secret) return "";
  return createHmac("sha256", secret).update(`attendance:${timestamp}`).digest("hex");
}

export function createAttendanceSession() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return `${timestamp}.${signature(timestamp)}`;
}

export function isAttendanceSessionValid(value?: string) {
  if (!value) return false;
  const [timestamp, supplied, extra] = value.split(".");
  if (!timestamp || !supplied || extra || !/^\d+$/.test(timestamp)) return false;
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (age < 0 || age > SESSION_SECONDS) return false;
  const expected = signature(timestamp);
  if (!expected || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function matchesAdminPassword(candidate: string, expected: string) {
  const candidateHash = createHmac("sha256", "attendance-password-check").update(candidate).digest();
  const expectedHash = createHmac("sha256", "attendance-password-check").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}
