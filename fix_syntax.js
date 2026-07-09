const fs = require('fs');

let appJs = fs.readFileSync('public/app.js', 'utf8');

const regexToFix = /container\.innerHTML = subTabsHtml \+ `\s*<table class="premium-table" id="cashflow-table">`;\s*<thead>/g;

if (regexToFix.test(appJs)) {
  appJs = appJs.replace(regexToFix, `container.innerHTML = subTabsHtml + \`
    <table class="premium-table" id="cashflow-table">
      <thead>`);
  fs.writeFileSync('public/app.js', appJs);
  console.log('Fixed syntax error in app.js!');
} else {
  console.log('Could not find the syntax error string.');
}
