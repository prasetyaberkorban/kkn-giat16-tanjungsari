import { NextRequest, NextResponse } from "next/server";
import { getAuthClient } from "@/lib/drive";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const authClient = getAuthClient();
    const tokenRes = await authClient.getAccessToken();

    if (!tokenRes || !tokenRes.token) {
      return new NextResponse("Failed to obtain access token", { status: 500 });
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image from Google", { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400", // cache for 1 day
      },
    });
  } catch (error: any) {
    console.error("Thumbnail proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
