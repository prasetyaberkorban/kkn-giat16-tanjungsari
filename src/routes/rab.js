const express = require('express');
const router = express.Router();
const Rab = require('../models/Rab');

// GET all RAB items
router.get('/', async (req, res) => {
  try {
    const items = await Rab.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching RAB:', err);
    res.status(500).json({ error: 'Gagal mengambil data RAB' });
  }
});

// POST new RAB item
router.post('/', async (req, res) => {
  try {
    const { type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota } = req.body;
    const newItem = new Rab({
      type,
      prokerName,
      kebutuhan,
      satuan,
      volume: volume || 1,
      harga: harga || 0,
      hargaSatuan: hargaSatuan || 0,
      anggota: anggota || 11
    });
    await newItem.save();
    res.status(201).json({ message: 'RAB berhasil ditambahkan', item: newItem });
  } catch (err) {
    console.error('Error adding RAB:', err);
    res.status(500).json({ error: 'Gagal menambahkan RAB' });
  }
});

// PUT update RAB item
router.put('/:id', async (req, res) => {
  try {
    const { type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota } = req.body;
    const updatedItem = await Rab.findByIdAndUpdate(req.params.id, {
      type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota
    }, { new: true });
    res.json({ message: 'RAB berhasil diperbarui', item: updatedItem });
  } catch (err) {
    console.error('Error updating RAB:', err);
    res.status(500).json({ error: 'Gagal memperbarui RAB' });
  }
});

// DELETE a RAB item
router.delete('/:id', async (req, res) => {
  try {
    await Rab.findByIdAndDelete(req.params.id);
    res.json({ message: 'RAB berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting RAB:', err);
    res.status(500).json({ error: 'Gagal menghapus RAB' });
  }
});

module.exports = router;
