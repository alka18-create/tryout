import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/teacher");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/dashboard/student");
  }

  return (
    <DashboardLayout
      role="TEACHER"
      userName={session.user.name || "Guru"}
      userEmail={session.user.email || ""}
      userImage={session.user.image}
    >
      {children}
    </DashboardLayout>
  );
}
