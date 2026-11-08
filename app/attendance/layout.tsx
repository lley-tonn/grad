import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Attendance | Lleyton Adrian",
  robots: { index: false, follow: false }
};

export default function AttendanceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
