const fs = require('fs');

// 1. UPDATE QrSetting.js
let model = fs.readFileSync('src/models/QrSetting.js', 'utf8');
if (!model.includes('theme: {')) {
  model = model.replace('active_shortlink: {', `theme: { type: String, default: 'theme-viens' },\n  active_shortlink: {`);
  fs.writeFileSync('src/models/QrSetting.js', model);
}

// 2. UPDATE api.js
let api = fs.readFileSync('src/routes/api.js', 'utf8');
if (!api.includes("router.get('/theme'")) {
  const themeEndpoints = `
// Get Global Theme
router.get('/theme', async (req, res) => {
  try {
    let setting = await QrSetting.findOne();
    if (!setting) {
      setting = new QrSetting();
      await setting.save();
    }
    res.json({ success: true, theme: setting.theme || 'theme-viens' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Global Theme
router.post('/theme', async (req, res) => {
  try {
    const { theme } = req.body;
    let setting = await QrSetting.findOne();
    if (!setting) {
      setting = new QrSetting();
    }
    setting.theme = theme;
    await setting.save();
    res.json({ success: true, theme: setting.theme });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
`;
  api = api.replace('module.exports = router;', themeEndpoints + '\nmodule.exports = router;');
  fs.writeFileSync('src/routes/api.js', api);
}

console.log('Backend patched successfully!');
