import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/drive";

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    const drive = getDriveClient();

    // Use trash instead of permanent delete for safety
    await drive.files.update({
      fileId: fileId,
      requestBody: { trashed: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Drive Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
