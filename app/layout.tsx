import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agenorwoth Lleyton Adrian — The Next Chapter",
  description: "A digital graduation invitation celebrating Agenorwoth Lleyton Adrian's Bachelor of Science in Computer Science.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  openGraph: {
    title: "Agenorwoth Lleyton Adrian — The Next Chapter",
    description: "One journey. One milestone. A new beginning.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
