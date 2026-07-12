import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/drive";

export async function POST(request: NextRequest) {
  try {
    const { folderName, parentId } = await request.json();

    if (!folderName || !parentId) {
      return NextResponse.json({ error: "Missing folderName or parentId" }, { status: 400 });
    }

    const drive = await getDriveClient();
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, name",
    });

    return NextResponse.json({ success: true, folder: res.data });
  } catch (error: any) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create folder" },
      { status: 500 }
    );
  }
}
