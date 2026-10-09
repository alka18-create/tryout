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
  GraduationCap,
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
    { label: "Materi Belajar", href: "/dashboard/student/materials", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "Riwayat & Hasil", href: "/dashboard/student/history", icon: <History className="w-4 h-4" /> },
    { label: "Profil Saya", href: "/dashboard/student/profile", icon: <UserIcon className="w-4 h-4" /> },
  ];

  const teacherNav: NavItem[] = [
    { label: "Dashboard Guru", href: "/dashboard/teacher", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Bank Soal", href: "/dashboard/teacher/questions", icon: <FileQuestion className="w-4 h-4" /> },
    { label: "Manajemen Tryout", href: "/dashboard/teacher/tryouts", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "Materi Belajar", href: "/dashboard/teacher/materials", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "Analisis & Laporan", href: "/dashboard/teacher/reports", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const adminNav: NavItem[] = [
    { label: "Dashboard Admin", href: "/dashboard/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Bank Soal & Import", href: "/dashboard/teacher/questions", icon: <FileQuestion className="w-4 h-4" /> },
    { label: "Manajemen Tryout", href: "/dashboard/teacher/tryouts", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "Materi Belajar", href: "/dashboard/teacher/materials", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "Laporan & Nilai", href: "/dashboard/teacher/reports", icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Kelola Pengguna", href: "/dashboard/admin/users", icon: <Users className="w-4 h-4" /> },
    { label: "Master Sekolah", href: "/dashboard/admin/schools", icon: <Building2 className="w-4 h-4" /> },
  ];

  const navItems = role === "ADMIN" ? adminNav : role === "TEACHER" ? teacherNav : studentNav;

  const roleLabel =
    role === "ADMIN" ? "Administrator" : role === "TEACHER" ? "Guru / Pendidik" : "Siswa / Peserta";

  const roleBadgeColor =
    role === "ADMIN"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : role === "TEACHER"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-2xs">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-black text-white shadow-xs shadow-blue-600/30">
            TK
          </div>
          <span>TryoutKu</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          aria-label="Toggle menu navigasi"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Tutup menu navigasi"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 max-w-[85vw] border-r border-slate-200/90 bg-white flex flex-col justify-between z-50 md:z-30 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        <div className="p-5 flex flex-col flex-1 overflow-y-auto">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 pb-6 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-xs shadow-blue-600/20">
              TK
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                Tryout<span className="text-blue-600">Ku</span>
              </div>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeColor}`}
              >
                {roleLabel}
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="mt-6 space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard/student" &&
                  item.href !== "/dashboard/teacher" &&
                  item.href !== "/dashboard/admin" &&
                  pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-xs shadow-blue-600/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 overflow-hidden shrink-0">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
              <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden bg-slate-50">
        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
