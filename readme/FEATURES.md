## NutriTrack — Daftar Fitur

Dokumen ini merangkum fitur yang **sudah ada di aplikasi** berdasarkan implementasi saat ini.

### Ringkasan Peran
- **Admin**
- **Ahli gizi** (`ahli_gizi`)
- **Klien** (`klien`)

Akses halaman dibatasi berdasarkan peran (role-based routing).

---

## Fitur Umum (Semua Peran)
- **Login (email & password)**
  - Autentikasi menggunakan Supabase.
- **Kontrol akses berbasis peran**
  - Pengguna hanya bisa membuka halaman sesuai role.
- **Status akun aktif/nonaktif**
  - Jika `is_active = false`, pengguna akan otomatis keluar dan tidak bisa mengakses aplikasi.

---

## Fitur Klien
### 1) Dashboard klien
- **Ringkasan log makanan terbaru**
  - Menampilkan log makanan beberapa hari terakhir dalam tabel ringkas.

### 2) Catat makanan harian (Food Entry)
- **Pilih waktu makan**: pagi / siang / malam / snack.
- **Aturan 1x per waktu makan per hari**
  - Waktu makan yang sudah tercatat hari ini tidak bisa dipilih lagi.
- **Input multi-item**
  - Satu waktu makan bisa berisi beberapa baris makanan (nama + jumlah + satuan).
- **Saran nama makanan (autocomplete)**
  - Membantu mengetik nama makanan berdasarkan saran/riwayat yang tersedia.
- **Analisa & estimasi kalori dengan AI**
  - Tombol “Analisa & simpan” akan menghitung estimasi kalori per item dan total.
- **Simpan hasil ke database**
  - Menyimpan log makanan dan item-itemnya.
- **Tampilan ringkasan/“struk” setelah tersimpan**
  - Menampilkan rincian item dan total estimasi kalori (bersifat estimasi).

### 3) Progres pengukuran
- **Grafik pengukuran**
  - Pilih metrik: berat badan / BMI / massa otot / massa lemak.
- **Filter periode**
  - 30 hari / 3 bulan / semua.
- **Riwayat pengukuran**
  - Tabel histori (BB, TB, BMI, otot, lemak).
- **Evaluasi rutin (ditampilkan ke klien)**
  - Menampilkan evaluasi yang dibuat oleh admin/ahli gizi untuk klien berdasarkan periode.

---

## Fitur Admin
### 1) Dashboard admin
- **Analitik “Makanan populer”**
  - Grafik tren makanan populer dengan rentang: harian / mingguan / bulanan.

### 2) Manajemen user
- **Daftar pengguna**
  - Menampilkan user dengan role dan status aktif.
- **Pencarian & pagination**
  - Cari berdasarkan nama/email/instalasi/nomor WA.
- **Tambah pengguna**
  - Membuat akun baru (admin/ahli_gizi/klien).
  - Password sementara bisa digenerate otomatis dan hanya ditampilkan sekali.

### 3) Impor user klien dari Excel
- **Upload file `.xlsx/.xls`**
- **Preview hasil parsing**
  - Menampilkan baris yang akan diimpor sebelum dijalankan.
- **Impor massal akun klien**
  - Membuat akun klien satu per satu via Supabase Auth.
- **Laporan hasil impor**
  - Bisa unduh CSV berisi status OK/GAGAL dan password sementara (untuk baris OK).

### 4) Master data satuan porsi (Food Units)
- **Tambah/ubah/hapus satuan porsi**
  - Contoh: centong, sendok, bungkus, dll.
  - Penghapusan bisa gagal jika satuan masih dipakai data.

### 5) Direktori klien & detail klien
- **Daftar klien**
  - Navigasi ke detail klien.
- **Detail klien**
  - Tab **Antropometri**
    - Input pengukuran (BB, TB, massa otot, massa lemak, catatan).
    - BMI dihitung otomatis.
    - Grafik pengukuran (pilih metrik).
    - Tabel riwayat pengukuran.
  - Tab **Log makan**
    - Melihat log makan klien.

### 6) Pantau log makan (Monitoring)
- **Filter log makan**
  - Pilih klien + rentang tanggal agar tidak memuat seluruh riwayat.
- **Input evaluasi rutin**
  - Disimpan per klien dan rentang tanggal:
    - Frekuensi olahraga
    - Istirahat cukup (ya/tidak)
    - Konsumsi sayur (kali/hari)
    - BMI
    - Catatan konsumsi/pemakaian
  - Evaluasi ini akan tampil di halaman progres klien.

---

## Fitur Ahli Gizi
### 1) Dashboard ahli gizi
- **Analitik “Makanan populer”**
- Shortcut:
  - **Daftar klien**
  - **Pantau log makan**

### 2) Daftar klien & detail klien
- **Daftar klien**
- **Detail klien**
  - Fungsinya sama seperti admin untuk antropometri & log makan.

### 3) Pantau log makan + evaluasi rutin
- **Monitoring log makan** dengan filter klien + rentang tanggal.
- **Buat evaluasi rutin** untuk ditampilkan ke klien di halaman progres.

---

## Komponen tabel log makan (dipakai di beberapa halaman)
- **Pengelompokan per tanggal**
- **Total per waktu makan** (pagi/siang/malam/snack) dan **total harian**
- **Detail** (modal) untuk melihat rincian log per tanggal
- **Pagination** untuk membatasi jumlah tanggal yang ditampilkan

