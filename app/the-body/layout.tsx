import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SERAPH / Experience 01 — The Body",
  description:
    "A cinematic chamber built around posture, proximity, touch, sound and a living digital body.",
};

export default function TheBodyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
