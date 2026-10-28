import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
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

    // Pastikan path tetap berada di dalam uploadsBaseDir
    if (!filePath.startsWith(uploadsBaseDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return new NextResponse("Not Found", { status: 404 });
    }
    console.error("[Uploads Route] Gagal membaca file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
