import type { Metadata } from "next";

import { MyProfileScreen } from "@/features/profiles/MyProfileScreen";

export const metadata: Metadata = {
  title: "My Profile",
};

export default function MyProfilePage() {
  return <MyProfileScreen />;
}
