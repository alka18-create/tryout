import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Baca JWT session token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const role = token?.role as string | undefined;

  // 1. Proteksi Halaman Dashboard Web & Lembar Ujian
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/exam")) {
    if (!token) {
      const url = new URL("/auth/login", request.url);
      url.searchParams.set("callbackUrl", encodeURI(pathname));
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/student", request.url));
    }

    if (pathname.startsWith("/dashboard/teacher") && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/student", request.url));
    }
  }

  // 2. Proteksi API Routes (RBAC) Sesuai Blueprint 02 §2.2
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

  return NextResponse.next();
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
