"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { ShieldAlert, Clock, LogOut, RefreshCw } from "lucide-react";

// Konfigurasi Batas Waktu Aktivitas
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit (600.000 ms)
export const WARNING_DURATION_MS = 60 * 1000; // Peringatan muncul di sisa 60 detik (9 menit idle)
export const STORAGE_KEY_LAST_ACTIVE = "tryoutku_last_activity";
export const STORAGE_KEY_LOGOUT = "tryoutku_session_logout";
export const COOKIE_NAME_LAST_ACTIVE = "tryoutku_last_activity";

// Helper untuk memperbarui cookie aktivitas
function setActivityCookie(timestamp: number) {
  if (typeof document === "undefined") return;
  // Cookie aktif selama 1 hari, diperbarui setiap ada aksi
  document.cookie = `${COOKIE_NAME_LAST_ACTIVE}=${timestamp}; path=/; max-age=86400; SameSite=Lax`;
}

function clearActivityCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME_LAST_ACTIVE}=; path=/; max-age=0; SameSite=Lax`;
}

export function SessionIdleTimer() {
  const { data: session, status } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const lastWriteTimeRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);

  // Fungsi Logout Terpusat
  const performAutoLogout = useCallback(
    async (reason = "timeout") => {
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;
      setIsLoggingOut(true);

      try {
        // Beritahu tab browser lain melalui localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_LOGOUT, Date.now().toString());
          localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
          clearActivityCookie();
        }

        // Redirect dengan alasan logout
        await signOut({
          redirect: true,
          callbackUrl: `/auth/login?reason=${reason}`,
        });
      } catch (err) {
        console.error("Gagal melakukan auto logout:", err);
        // Fallback jika signOut next-auth gagal/terkendala jaringan
        if (typeof window !== "undefined") {
          window.location.href = `/auth/login?reason=${reason}`;
        }
      }
    },
    [],
  );

  // Perbarui timestamp aktivitas secara aman (dithrottle 3 detik)
  const recordActivity = useCallback(() => {
    if (isLoggingOutRef.current) return;
    const now = Date.now();

    // Sembunyikan dialog peringatan jika pengguna berinteraksi
    if (showWarning) {
      setShowWarning(false);
    }

    // Throttle penulisan ke localStorage & cookie agar tidak membebani performa
    if (now - lastWriteTimeRef.current > 3000) {
      lastWriteTimeRef.current = now;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
        setActivityCookie(now);
      }
    }
  }, [showWarning]);

  // Handler tombol "Tetap Masuk"
  const handleStayLoggedIn = () => {
    const now = Date.now();
    lastWriteTimeRef.current = now;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
      setActivityCookie(now);
    }
    setShowWarning(false);
    setRemainingSeconds(60);
  };

  // Sinkronisasi status autentikasi & inisialisasi timestamp
  useEffect(() => {
    if (status !== "authenticated" || !session) {
      setShowWarning(false);
      return;
    }

    // Set waktu awal saat login terdeteksi
    const now = Date.now();
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_LAST_ACTIVE) : null;
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
      setActivityCookie(now);
      lastWriteTimeRef.current = now;
    } else {
      // Jika waktu tersimpan sudah melampaui 10 menit saat halaman dimuat
      const diff = now - Number(stored);
      if (diff >= INACTIVITY_TIMEOUT_MS) {
        performAutoLogout("timeout");
        return;
      }
      lastWriteTimeRef.current = Number(stored);
    }
  }, [status, session, performAutoLogout]);

  // Listener event interaksi pengguna
  useEffect(() => {
    if (status !== "authenticated") return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click", "wheel"];

    const eventHandler = () => {
      recordActivity();
    };

    events.forEach((eventName) => {
      window.addEventListener(eventName, eventHandler, { passive: true });
    });

    // Multi-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LAST_ACTIVE && e.newValue) {
        const remoteTime = Number(e.newValue);
        lastWriteTimeRef.current = remoteTime;
        setShowWarning(false);
      } else if (e.key === STORAGE_KEY_LOGOUT) {
        // Tab lain telah melakukan logout
        performAutoLogout("remote");
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, eventHandler);
      });
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [status, recordActivity, performAutoLogout]);

  // Heartbeat interval pemeriksaan waktu inaktivitas setiap 1 detik
  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const now = Date.now();
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_LAST_ACTIVE) : null;
      const lastActive = stored ? Number(stored) : lastWriteTimeRef.current;
      const elapsed = now - lastActive;

      // 1. Lewati batas 10 menit (600 detik) -> Auto Logout Seketika
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        performAutoLogout("timeout");
        return;
      }

      // 2. Masuk zona peringatan (sisa <= 60 detik) -> Tampilkan Dialog
      const warningThreshold = INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS;
      if (elapsed >= warningThreshold) {
        const timeLeftMs = INACTIVITY_TIMEOUT_MS - elapsed;
        const seconds = Math.max(1, Math.ceil(timeLeftMs / 1000));
        setRemainingSeconds(seconds);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, performAutoLogout]);

  // Jika tidak dalam kondisi peringatan atau belum login, jangan render apapun
  if (!showWarning || status !== "authenticated") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Banner Aksen Atas */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />

        <div className="p-6 sm:p-7">
          {/* Header Ikon & Judul */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 id="idle-warning-title" className="text-lg font-bold text-slate-900 leading-tight">
                Peringatan Keamanan Sesi
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada aktivitas yang terdeteksi selama hampir 10 menit.
              </p>
            </div>
          </div>

          {/* Area Countdown Timer */}
          <div className="mt-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-900 text-xs font-semibold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Sesi Anda akan otomatis keluar dalam:</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-black text-amber-700 bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-2xs text-sm">
              <span>{remainingSeconds}</span>
              <span className="text-[11px] font-sans font-medium text-amber-600">dtk</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-600 leading-relaxed">
            Demi menjaga keamanan akun dan kerahasiaan data Anda, sesi akan diakhiri secara otomatis jika tidak ada respons lanjutan.
          </p>

          {/* Tombol Aksi */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-3">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => performAutoLogout("manual")}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Keluar Sekarang</span>
            </button>

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleStayLoggedIn}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tetap Masuk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
