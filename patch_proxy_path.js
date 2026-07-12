const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// Replace app.use('/gdrive', ...) and app.use('/_next', ...) with a robust proxy configuration
const oldProxy = `// 2. Setup Proxy Middleware
app.use('/gdrive', createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  ws: true // proxy websockets for Next.js HMR
}));
app.use('/_next', createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  ws: true 
}));`;

const newProxy = `// 2. Setup Proxy Middleware
// We use app.use without a path prefix to prevent Express from stripping the path.
// Instead, we filter by path inside the proxy configuration.
app.use(createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  ws: true, // proxy websockets for Next.js HMR
  pathFilter: function (path, req) {
    // Only proxy requests that start with /gdrive or /_next
    return path.startsWith('/gdrive') || path.startsWith('/_next');
  }
}));`;

serverJs = serverJs.replace(oldProxy, newProxy);

fs.writeFileSync('server.js', serverJs);
console.log('Proxy configuration updated!');
