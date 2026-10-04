import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const role = session.user.role;

  if (role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (role === "TEACHER") {
    redirect("/dashboard/teacher");
  }

  redirect("/dashboard/student");
}
