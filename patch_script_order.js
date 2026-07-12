const fs = require('fs');

let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// The scripts are currently above the modal. We need to extract them and place them at the end.
const scriptRegex = /(<script src="\/app\.js\?v=\d+"><\/script>\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/flatpickr"><\/script>)/;

const match = indexHtml.match(scriptRegex);
if (match) {
    const scripts = match[0];
    
    // Remove scripts from original location
    indexHtml = indexHtml.replace(scripts, '');
    
    // Place scripts right before </body>
    indexHtml = indexHtml.replace('</body>', scripts + '\n</body>');
} else {
    // If we can't find them together, let's just find app.js
    const appJsRegex = /<script src="\/app\.js\?v=\d+"><\/script>/;
    const matchAppJs = indexHtml.match(appJsRegex);
    if (matchAppJs) {
        const appJsStr = matchAppJs[0];
        indexHtml = indexHtml.replace(appJsStr, '');
        indexHtml = indexHtml.replace('</body>', appJsStr + '\n</body>');
    }
}

// BUMP VERSION
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.4\.0/g, 'v1.4.1');
// Make sure app.js is bumped
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);

fs.writeFileSync('public/index.html', indexHtml);

console.log('Script moved to bottom!');
