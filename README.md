# Rute Kabut — Website Open Trip (Portfolio Nauval Dev)

Contoh website **Travel** untuk operator open trip: merek fiktif, destinasi nyata di sekitar Bandung.
HTML/CSS/JS biasa, tanpa build tool. Buka `index.html` langsung di browser.

## Fitur
- Strip "berangkat paling dekat" (3 jadwal terdekat yang masih ada kursi)
- Jadwal keberangkatan seperti papan keberangkatan: filter bulan & jenis trip, sisa kursi, jadwal penuh otomatis nonaktif
- Kartu paket dengan **profil ketinggian rute**, titik tertinggi (mdpl), jarak, durasi, tingkat kesulitan
- Detail paket: itinerary per jam, termasuk / tidak termasuk / barang bawaan
- Form daftar: pilih tanggal (sisa kursi), jumlah peserta (dibatasi sisa kursi), titik jemput,
  hitung total, DP 50%, dan tanggal pelunasan H-3
- Form trip privat (min. 10 orang)
- Semua pendaftaran dikirim sebagai pesan WhatsApp yang rapi

## Menyesuaikan
Isi ada di `assets/js/data.js` (paket, harga, itinerary, titik jemput, aturan DP, FAQ).
Jadwal & sisa kursi di demo dibuat otomatis; untuk dipakai sungguhan bisa dihubungkan ke Google Sheets
seperti demo playroom. Isi `WA_NUMBER` lalu set `DEMO: false`.

## Kredit foto
“Human Mountain” oleh Wahyu Fa (CC0, Wikimedia Commons) dan siluet punggungan saat senja (CC0, rawpixel).
Lokasi foto bukan rute trip di website ini.
