const fs = require('fs');

const serverJsPath = 'server.js';
let serverJs = fs.readFileSync(serverJsPath, 'utf8');

const multerImport = "const { createProxyMiddleware } = require('http-proxy-middleware');\nconst { spawn } = require('child_process');\nconst multer = require('multer');\nconst os = require('os');\nconst fsModule = require('fs');\nconst { google } = require('googleapis');\n";

const uploadRoute = `
// ================= GDRIVE UPLOAD INTERCEPTOR (BYPASS NEXT.JS RAM LIMIT) =================
const upload = multer({ dest: os.tmpdir() });
app.post('/gdrive/api/drive/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const folderId = req.body.folderId;
  if (!folderId) return res.status(400).json({ error: 'Folder ID is required' });

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = { name: req.file.originalname, parents: [folderId] };
    const media = {
      mimeType: req.file.mimetype,
      body: fsModule.createReadStream(req.file.path)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name",
    });

    // Cleanup temp file immediately
    fsModule.unlinkSync(req.file.path);
    return res.json({ success: true, file: response.data });
  } catch (err) {
    console.error("Express Drive Upload Error:", err);
    if (fsModule.existsSync(req.file.path)) fsModule.unlinkSync(req.file.path);
    return res.status(500).json({ error: err.message });
  }
});
// ========================================================================================
`;

// Replace imports
serverJs = serverJs.replace("const { createProxyMiddleware } = require('http-proxy-middleware');\nconst { spawn } = require('child_process');", multerImport);

// Insert route before proxy
serverJs = serverJs.replace("// 2. Setup Proxy Middleware", uploadRoute + "\n// 2. Setup Proxy Middleware");

fs.writeFileSync(serverJsPath, serverJs);
console.log("Express upload interceptor added!");
