import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SERAPH / Experience 02 — Waking Relic",
  description:
    "A dormant wireframe relic that wakes through attention, motion, light and sound.",
};

export default function WakingRelicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
