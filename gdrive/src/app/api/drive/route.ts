import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/drive";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get("folderId");

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    const drive = getDriveClient();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink)",
      orderBy: "folder, modifiedTime desc",
      pageSize: 50,
    });

    const files = response.data.files || [];
    
    const formattedFiles = files.map(f => {
      let type = "unknown";
      if (f.mimeType === "application/vnd.google-apps.folder") type = "folder";
      else if (f.mimeType?.startsWith("image/")) type = "image";
      else if (f.mimeType?.startsWith("video/")) type = "video";
      else if (f.mimeType === "application/pdf") type = "pdf";
      else if (f.mimeType === "application/vnd.google-apps.spreadsheet" || f.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") type = "excel";

      return {
        id: f.id,
        name: f.name,
        type,
        size: f.size ? formatBytes(parseInt(f.size)) : "--",
        date: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : "--",
        thumbnail: f.thumbnailLink ? `/api/drive/thumbnail?url=${encodeURIComponent(f.thumbnailLink)}` : null,
        webViewLink: f.webViewLink,
        downloadLink: f.webContentLink
      };
    });

    return NextResponse.json({ files: formattedFiles });
  } catch (error: any) {
    console.error("Drive API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
