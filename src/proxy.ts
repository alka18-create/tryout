import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit batas waktu inaktivitas
export const LAST_ACTIVITY_COOKIE = "tryoutku_last_activity";

function attachActivityCookie(response: NextResponse, timestamp: number) {
  response.cookies.set(LAST_ACTIVITY_COOKIE, timestamp.toString(), {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(LAST_ACTIVITY_COOKIE);
  response.cookies.delete("authjs.session-token");
  response.cookies.delete("__Secure-authjs.session-token");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const now = Date.now();

  // Baca JWT session token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const role = token?.role as string | undefined;

  // 1. Validasi Batas Waktu Inaktivitas (10 Menit)
  if (token) {
    const lastActiveCookie = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
    if (lastActiveCookie) {
      const lastActiveTime = parseInt(lastActiveCookie, 10);
      if (!isNaN(lastActiveTime) && now - lastActiveTime > INACTIVITY_TIMEOUT_MS) {
        // Sesi telah melampaui 10 menit inaktivitas -> Paksa logout
        if (pathname.startsWith("/api/")) {
          const res = NextResponse.json(
            {
              success: false,
              error: {
                code: "SESSION_TIMEOUT",
                message: "Sesi Anda telah berakhir karena tidak ada aktivitas selama 10 menit. Silakan login kembali.",
              },
            },
            { status: 401 },
          );
          return clearSessionCookies(res);
        }

        const url = new URL("/auth/login", request.url);
        url.searchParams.set("reason", "timeout");
        if (pathname.startsWith("/dashboard") || pathname.startsWith("/exam")) {
          url.searchParams.set("callbackUrl", encodeURI(pathname));
        }
        const res = NextResponse.redirect(url);
        return clearSessionCookies(res);
      }
    }
  }

  // 2. Proteksi Halaman Dashboard Web & Lembar Ujian
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/exam")) {
    if (!token) {
      const url = new URL("/auth/login", request.url);
      url.searchParams.set("callbackUrl", encodeURI(pathname));
      return NextResponse.redirect(url);
    }

    // Jika user mengakses /dashboard root, arahkan langsung ke dashboard sesuai role
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      let dest = "/dashboard/student";
      if (role === "ADMIN") {
        dest = "/dashboard/admin";
      } else if (role === "TEACHER") {
        dest = "/dashboard/teacher";
      }
      const res = NextResponse.redirect(new URL(dest, request.url));
      return attachActivityCookie(res, now);
    }

    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      const res = NextResponse.redirect(new URL("/dashboard/student", request.url));
      return attachActivityCookie(res, now);
    }

    if (pathname.startsWith("/dashboard/teacher") && role !== "TEACHER" && role !== "ADMIN") {
      const res = NextResponse.redirect(new URL("/dashboard/student", request.url));
      return attachActivityCookie(res, now);
    }
  }

  // 3. Proteksi API Routes (RBAC) Sesuai Blueprint 02 §2.2
  if (pathname.startsWith("/api/student")) {
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Sesi login tidak ditemukan. Silakan login terlebih dahulu.",
          },
        },
        { status: 401 },
      );
    }
  }

  if (pathname.startsWith("/api/teacher")) {
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Sesi login tidak ditemukan. Silakan login terlebih dahulu.",
          },
        },
        { status: 401 },
      );
    }
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Hanya guru atau administrator yang memiliki hak akses ke endpoint ini.",
          },
        },
        { status: 403 },
      );
    }
  }

  if (pathname.startsWith("/api/admin")) {
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Sesi login tidak ditemukan. Silakan login terlebih dahulu.",
          },
        },
        { status: 401 },
      );
    }
    if (role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Hanya administrator yang memiliki hak akses ke endpoint ini.",
          },
        },
        { status: 403 },
      );
    }
  }

  // Berikan respon normal & perbarui waktu aktivitas jika terotentikasi
  const response = NextResponse.next();
  if (token) {
    attachActivityCookie(response, now);
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/exam/:path*",
    "/api/student/:path*",
    "/api/teacher/:path*",
    "/api/admin/:path*",
  ],
};
