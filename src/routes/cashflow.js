const express = require('express');
const router = express.Router();
const Cashflow = require('../models/Cashflow');

// GET all cashflow items, sorted by date and created time
router.get('/', async (req, res) => {
  try {
    const items = await Cashflow.find().sort({ tanggal: 1, createdAt: 1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching Cashflow:', err);
    res.status(500).json({ error: 'Gagal mengambil data Cashflow' });
  }
});

// POST new cashflow item
router.post('/', async (req, res) => {
  try {
    const { tanggal, kategori, deskripsi, jenis, hargaSatuan, jumlahBarang, nominal } = req.body;
    const newItem = new Cashflow({
      tanggal,
      kategori,
      deskripsi,
      jenis,
      hargaSatuan: parseInt(hargaSatuan) || 0,
      jumlahBarang: parseInt(jumlahBarang) || 0,
      nominal: parseInt(nominal) || 0
    });
    await newItem.save();
    res.status(201).json({ message: 'Cashflow berhasil ditambahkan', item: newItem });
  } catch (err) {
    console.error('Error adding Cashflow:', err);
    res.status(500).json({ error: 'Gagal menambahkan Cashflow' });
  }
});

// DELETE a cashflow item
router.delete('/:id', async (req, res) => {
  try {
    await Cashflow.findByIdAndDelete(req.params.id);
    res.json({ message: 'Cashflow berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting Cashflow:', err);
    res.status(500).json({ error: 'Gagal menghapus Cashflow' });
  }
});


// PUT update a cashflow item
router.put('/:id', async (req, res) => {
  try {
    const { tanggal, kategori, deskripsi, jenis, hargaSatuan, jumlahBarang, nominal } = req.body;
    const updatedItem = await Cashflow.findByIdAndUpdate(
      req.params.id,
      {
        tanggal,
        kategori,
        deskripsi,
        jenis,
        hargaSatuan: parseInt(hargaSatuan) || 0,
        jumlahBarang: parseInt(jumlahBarang) || 0,
        nominal: parseInt(nominal) || 0
      },
      { new: true }
    );
    res.json({ message: 'Cashflow berhasil diupdate', item: updatedItem });
  } catch (err) {
    console.error('Error updating Cashflow:', err);
    res.status(500).json({ error: 'Gagal mengupdate Cashflow' });
  }
});

module.exports = router;
