import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/student");
  }

  return (
    <DashboardLayout
      role="STUDENT"
      userName={session.user.name || "Peserta"}
      userEmail={session.user.email || ""}
      userImage={session.user.image}
    >
      {children}
    </DashboardLayout>
  );
}
