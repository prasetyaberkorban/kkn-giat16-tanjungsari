const fs = require('fs');

// 1. UPDATE package.json in root
let pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkgJson.scripts = pkgJson.scripts || {};
pkgJson.scripts.postinstall = "cd gdrive && npm install && npm run build";
fs.writeFileSync('package.json', JSON.stringify(pkgJson, null, 2));

// 2. UPDATE gdrive/next.config.ts
let nextConfig = fs.readFileSync('gdrive/next.config.ts', 'utf8');
if (!nextConfig.includes('basePath')) {
    // Inject basePath before closing brace
    nextConfig = nextConfig.replace('};\n\nexport default nextConfig;', '  basePath: "/gdrive",\n};\n\nexport default nextConfig;');
    fs.writeFileSync('gdrive/next.config.ts', nextConfig);
}

// 3. UPDATE server.js
let serverJs = fs.readFileSync('server.js', 'utf8');

const proxyLogic = `
// ================= GDRIVE NEXT.JS INTEGRATION =================
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');

// 1. Spawn Next.js server on port 3001
const isProd = process.env.NODE_ENV === 'production';
const nextCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nextArgs = ['run', isProd ? 'start' : 'dev', '--', '-p', '3001'];

console.log('Starting Next.js GDrive on port 3001...');
const nextProcess = spawn(nextCmd, nextArgs, { 
  cwd: path.join(__dirname, 'gdrive'),
  env: { ...process.env, PORT: '3001' },
  stdio: 'pipe'
});

nextProcess.stdout.on('data', (data) => console.log('[Next.js]:', data.toString().trim()));
nextProcess.stderr.on('data', (data) => console.error('[Next.js Error]:', data.toString().trim()));

// 2. Setup Proxy Middleware
app.use('/gdrive', createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  ws: true // proxy websockets for Next.js HMR
}));
app.use('/_next', createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  ws: true 
}));
// ==============================================================
`;

if (!serverJs.includes('http-proxy-middleware')) {
    // Inject after Middleware (line 19/20)
    serverJs = serverJs.replace('app.use(express.urlencoded({ extended: true }));', 'app.use(express.urlencoded({ extended: true }));\n' + proxyLogic);
    fs.writeFileSync('server.js', serverJs);
}

// 4. UPDATE index.html link
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
indexHtml = indexHtml.replace('href="http://kkngiat16tanjungsari.foerta.tech:3000"', 'href="/gdrive"');
fs.writeFileSync('public/index.html', indexHtml);

console.log('Integration setup completed!');
