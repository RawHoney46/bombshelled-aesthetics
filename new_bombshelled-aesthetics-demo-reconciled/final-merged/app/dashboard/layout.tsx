import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bombshelled Aesthetics — Dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
