import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard/student");
  }

  return (
    <DashboardLayout
      role="ADMIN"
      userName={session.user.name || "Administrator"}
      userEmail={session.user.email || ""}
      userImage={session.user.image}
    >
      {children}
    </DashboardLayout>
  );
}
