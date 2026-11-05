import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Header keamanan untuk semua file yang disajikan dari folder upload.
 * - nosniff: browser tidak boleh menebak tipe konten.
 * - CSP sandbox: jika ada file berbahaya yang lolos, script tidak dieksekusi.
 * - Content-Disposition inline: hanya untuk gambar yang tipenya dikenali.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Cegah path traversal
    const safeSegments = pathSegments.filter((seg) => !seg.includes("..") && !seg.includes("/"));
    if (safeSegments.length !== pathSegments.length) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const uploadsBaseDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsBaseDir, ...safeSegments);

    // Pastikan path tetap berada di dalam uploadsBaseDir (bukan prefix palsu)
    const relativePath = path.relative(uploadsBaseDir, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext];

    // Hanya sajikan format gambar yang diizinkan. File lain (termasuk SVG/HTML)
    // tidak boleh dirender inline oleh browser.
    if (!contentType) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...SECURITY_HEADERS,
      },
    });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "ENOENT") {
      return new NextResponse("Not Found", { status: 404 });
    }
    console.error("[Uploads Route] Gagal membaca file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
