const express = require('express');
const router = express.Router();
const RabSetting = require('../models/RabSetting');

// GET setting by type
router.get('/:type', async (req, res) => {
  try {
    const setting = await RabSetting.findOne({ type: req.params.type });
    if (!setting) {
      return res.json({ type: req.params.type, uangSisa: 0 });
    }
    res.json(setting);
  } catch (err) {
    console.error('Error fetching RabSetting:', err);
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});

// PUT setting by type
router.put('/:type', async (req, res) => {
  try {
    const { uangSisa } = req.body;
    let setting = await RabSetting.findOne({ type: req.params.type });
    if (!setting) {
      setting = new RabSetting({ type: req.params.type, uangSisa });
    } else {
      setting.uangSisa = uangSisa;
    }
    await setting.save();
    res.json({ message: 'Berhasil menyimpan', setting });
  } catch (err) {
    console.error('Error saving RabSetting:', err);
    res.status(500).json({ error: 'Gagal menyimpan data' });
  }
});

module.exports = router;
