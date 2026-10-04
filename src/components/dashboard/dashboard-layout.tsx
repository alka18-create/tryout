"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  History,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  FileQuestion,
  FileSpreadsheet,
  BarChart3,
  Users,
  Building2,
  Settings,
  ChevronRight,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  role: "STUDENT" | "TEACHER" | "ADMIN";
  userName: string;
  userEmail: string;
  userImage?: string | null;
  children: React.ReactNode;
}

export function DashboardLayout({
  role,
  userName,
  userEmail,
  userImage,
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const studentNav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard/student", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Daftar Tryout", href: "/dashboard/student/tryouts", icon: <BookOpen className="w-4 h-4" /> },
    { label: "Riwayat & Hasil", href: "/dashboard/student/history", icon: <History className="w-4 h-4" /> },
    { label: "Profil Saya", href: "/dashboard/student/profile", icon: <UserIcon className="w-4 h-4" /> },
  ];

  const teacherNav: NavItem[] = [
    { label: "Dashboard Guru", href: "/dashboard/teacher", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Bank Soal", href: "/dashboard/teacher/questions", icon: <FileQuestion className="w-4 h-4" /> },
    { label: "Manajemen Tryout", href: "/dashboard/teacher/tryouts", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "Analisis & Laporan", href: "/dashboard/teacher/reports", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const adminNav: NavItem[] = [
    { label: "Dashboard Admin", href: "/dashboard/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Kelola Pengguna", href: "/dashboard/admin/users", icon: <Users className="w-4 h-4" /> },
    { label: "Master Sekolah", href: "/dashboard/admin/schools", icon: <Building2 className="w-4 h-4" /> },
    { label: "Pengaturan Sistem", href: "/dashboard/admin/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const navItems = role === "ADMIN" ? adminNav : role === "TEACHER" ? teacherNav : studentNav;

  const roleLabel =
    role === "ADMIN" ? "Administrator" : role === "TEACHER" ? "Guru / Pendidik" : "Siswa / Peserta";

  const roleBadgeColor =
    role === "ADMIN"
      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
      : role === "TEACHER"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 font-bold text-white tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black">
            TK
          </div>
          <span>TryoutKu</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 border-r border-slate-800/80 bg-slate-900/80 backdrop-blur-xl flex flex-col justify-between z-30 transition-transform md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 flex flex-col flex-1 overflow-y-auto">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 pb-6 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-black text-white shadow-md shadow-indigo-500/20">
              TK
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white leading-none">
                Tryout<span className="text-indigo-400">Ku</span>
              </div>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeColor}`}
              >
                {roleLabel}
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="mt-6 space-y-1.5 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard/student" && item.href !== "/dashboard/teacher" && item.href !== "/dashboard/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400 overflow-hidden shrink-0">
              {userImage ? (
                <img src={userImage} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-slate-400 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
