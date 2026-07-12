import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/drive";

export async function GET(request: NextRequest) {
  try {
    const drive = await getDriveClient();
    
    // Fetch files that are in the trash
    const res = await drive.files.list({
      q: "trashed = true",
      fields: "files(id, name, mimeType, modifiedTime, size, webViewLink, webContentLink, thumbnailLink)",
      orderBy: "modifiedTime desc",
      pageSize: 100,
    });

    const formatBytes = (bytes: string | null | undefined) => {
      if (!bytes) return "-";
      const b = parseInt(bytes, 10);
      if (b < 1024) return b + " B";
      else if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
      else if (b < 1073741824) return (b / 1048576).toFixed(1) + " MB";
      else return (b / 1073741824).toFixed(1) + " GB";
    };

    const files = res.data.files?.map((file) => {
      let type = "file";
      if (file.mimeType === "application/vnd.google-apps.folder") type = "folder";
      else if (file.mimeType?.startsWith("image/")) type = "image";
      else if (file.mimeType?.startsWith("video/")) type = "video";
      else if (file.mimeType === "application/pdf") type = "pdf";
      else if (file.mimeType?.includes("spreadsheet") || file.mimeType?.includes("excel")) type = "excel";

      return {
        id: file.id,
        name: file.name,
        type: type,
        date: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "-",
        size: formatBytes(file.size),
        downloadLink: file.webContentLink,
        webViewLink: file.webViewLink,
        thumbnail: file.thumbnailLink ? `/gdrive/api/drive/thumbnail?url=${encodeURIComponent(file.thumbnailLink)}` : null,
      };
    }) || [];

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("Drive API Error (Trash):", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch trash files" },
      { status: 500 }
    );
  }
}
