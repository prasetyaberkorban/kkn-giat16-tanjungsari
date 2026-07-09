const fs = require('fs');

let cashflowJs = fs.readFileSync('src/routes/cashflow.js', 'utf8');

const putRoute = `
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
`;

if (!cashflowJs.includes('router.put')) {
  cashflowJs = cashflowJs.replace('module.exports = router;', putRoute + '\nmodule.exports = router;');
  fs.writeFileSync('src/routes/cashflow.js', cashflowJs);
  console.log("Added PUT route to cashflow.js");
}
