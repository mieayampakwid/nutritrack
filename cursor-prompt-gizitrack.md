# Cursor Prompt — GiziTrack RS
## Aplikasi Monitoring Gizi & Antropometri Rumah Sakit

---

## STACK & DEPENDENCIES

- React + Vite
- Supabase (auth, database, row-level security)
- shadcn/ui (komponen UI utama)
- Tailwind CSS
- OpenAI API (gpt-4o-mini) — untuk estimasi kalori
- React Router v6
- Tanstack Query (data fetching & caching)
- Recharts (grafik progress)
- Lucide React (icons)

---

## SUPABASE SCHEMA

Buat semua tabel berikut di Supabase:

```sql
-- Profiles (extend Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  nama text not null,
  email text not null,
  nomor_wa text,
  instalasi text,
  role text check (role in ('admin', 'ahli_gizi', 'klien')) not null default 'klien',
  created_at timestamptz default now()
);

-- Body measurements (hanya bisa diisi admin & ahli_gizi)
create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tanggal date not null,
  berat_badan numeric(5,2), -- kg
  tinggi_badan numeric(5,2), -- cm
  massa_otot numeric(5,2),   -- kg
  massa_lemak numeric(5,2),  -- %
  bmi numeric(5,2),          -- dihitung otomatis
  catatan text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique(user_id, tanggal)
);

-- Master ukuran rumah tangga
create table food_units (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique, -- centong, sendok teh, sendok makan, potong
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Seed data awal
insert into food_units (nama) values
  ('centong'), ('sendok teh'), ('sendok makan'),
  ('potong'), ('gelas'), ('buah'), ('lembar'), ('bungkus');

-- Food logs (header per waktu makan per hari)
create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tanggal date not null,
  waktu_makan text check (waktu_makan in ('pagi', 'siang', 'malam', 'snack')) not null,
  total_kalori numeric(8,2) default 0,
  status text check (status in ('saved')) default 'saved',
  created_at timestamptz default now(),
  unique(user_id, tanggal, waktu_makan)
);

-- Food log items (detail makanan per log)
create table food_log_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid references food_logs(id) on delete cascade,
  nama_makanan text not null,
  jumlah numeric(6,2) not null,
  unit_id uuid references food_units(id),
  unit_nama text not null, -- snapshot nama unit saat entry
  kalori_estimasi numeric(8,2) default 0,
  created_at timestamptz default now()
);

-- View: food history untuk autocomplete
create view food_name_suggestions as
  select nama_makanan, count(*) as frekuensi
  from food_log_items
  group by nama_makanan
  order by frekuensi desc;
```

### Row Level Security (RLS)

```sql
-- Aktifkan RLS di semua tabel
alter table profiles enable row level security;
alter table body_measurements enable row level security;
alter table food_logs enable row level security;
alter table food_log_items enable row level security;

-- Profiles: user lihat diri sendiri, admin/ahli_gizi lihat semua
create policy "profiles_self" on profiles
  for select using (auth.uid() = id);
create policy "profiles_staff" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'ahli_gizi'))
  );

-- Body measurements: klien hanya read, staff full access
create policy "measurements_klien_read" on body_measurements
  for select using (auth.uid() = user_id);
create policy "measurements_staff" on body_measurements
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'ahli_gizi'))
  );

-- Food logs: klien akses data sendiri, staff lihat semua
create policy "foodlogs_klien" on food_logs
  for all using (auth.uid() = user_id);
create policy "foodlogs_staff_read" on food_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'ahli_gizi'))
  );
```

---

## STRUKTUR FOLDER

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/
│   │   ├── AppShell.jsx
│   │   ├── Sidebar.jsx
│   │   └── TopBar.jsx
│   ├── food/
│   │   ├── FoodEntryForm.jsx
│   │   ├── FoodLogTable.jsx
│   │   └── FoodLogDetailModal.jsx
│   ├── measurement/
│   │   ├── MeasurementForm.jsx
│   │   └── MeasurementChart.jsx
│   └── shared/
│       ├── CaloriDisclaimer.jsx
│       └── LoadingSpinner.jsx
├── pages/
│   ├── auth/
│   │   └── LoginPage.jsx
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   ├── UserManagement.jsx
│   │   ├── FoodUnitMaster.jsx
│   │   └── ClientProgress.jsx
│   ├── ahli-gizi/
│   │   ├── GiziDashboard.jsx
│   │   ├── ClientList.jsx
│   │   └── ClientDetail.jsx
│   └── klien/
│       ├── KlienDashboard.jsx
│       ├── FoodEntry.jsx
│       └── MyProgress.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useFoodLog.js
│   └── useMeasurement.js
├── lib/
│   ├── supabase.js
│   ├── openai.js
│   └── bmiCalculator.js
└── App.jsx
```

---

## FITUR PER HALAMAN

### AUTH
- Login dengan email + password (Supabase Auth)
- Setelah login, redirect berdasarkan role:
  - admin → /admin/dashboard
  - ahli_gizi → /gizi/dashboard
  - klien → /klien/dashboard
- Tidak ada halaman register publik (admin yang buat akun)

---

### ADMIN — User Management (`/admin/users`)
- Tabel daftar semua user (nama, email, instalasi, nomor WA, role, tanggal daftar)
- Tombol "Tambah User" → modal form:
  - Nama lengkap
  - Email
  - Nomor WhatsApp
  - Instalasi
  - Role (admin / ahli_gizi / klien)
  - Password sementara (auto-generate, tampilkan sekali)
- Tombol edit & nonaktifkan user
- Import dari Excel: tombol upload .xlsx → parsing kolom (nama, email, instalasi, nomor_wa) → preview tabel → konfirmasi → bulk insert ke Supabase + buat Supabase Auth user

---

### ADMIN — Master Ukuran (`/admin/food-units`)
- Tabel ukuran rumah tangga yang ada
- Tambah / edit / hapus satuan
- Seed default: centong, sendok teh, sendok makan, potong, gelas, buah, lembar, bungkus

---

### ADMIN & AHLI GIZI — Client Progress (`/admin/clients` atau `/gizi/clients`)
- List semua klien dengan card ringkasan:
  - Nama, instalasi
  - BMI terakhir + tanggal
  - Rata-rata kalori 7 hari terakhir
- Klik klien → halaman detail:
  - Tab "Antropometri": form input measurement (tablet landscape-friendly) + grafik progress BB, BMI, massa otot, massa lemak
  - Tab "Log Makan": tabel log per 10 hari + modal detail

---

### HALAMAN ENTRY ANTROPOMETRI (Tablet Landscape)

Desain untuk layar tablet landscape (min-width: 1024px), touch-friendly:

```
Layout: 2 kolom
Kiri (40%): Identitas klien
  - Foto avatar (inisial)
  - Nama lengkap (besar, mudah dibaca)
  - Instalasi
  - Measurement terakhir (tanggal + nilai)

Kanan (60%): Form input
  - Tanggal (date picker, tombol besar)
  - Berat Badan (kg) — input numerik, tombol +/- besar untuk adjustment
  - Tinggi Badan (cm) — input numerik, tombol +/- besar
  - Massa Otot (kg) — input numerik
  - Massa Lemak (%) — input numerik
  - BMI — dihitung otomatis, tampil besar dengan warna status
    (Underweight: biru, Normal: hijau, Overweight: kuning, Obese: merah)
  - Catatan — textarea
  - Tombol Simpan (full width, tinggi 56px minimum)
```

Input numerik harus:
- Font size minimum 24px pada tablet
- Tombol +/- dengan padding touch target minimum 44x44px
- Keyboard numerik otomatis (`inputMode="decimal"`)

---

### KLIEN — Food Entry (`/klien/food-entry`)

**Layout:**
- Header: pilih tanggal + pilih waktu makan (pagi/siang/malam/snack) sebagai tab
- Area input: daftar baris makanan (dinamis, bisa tambah/hapus baris)

**Per baris makanan:**
```
[ Nama makanan (autocomplete) ] [ Jumlah ] [ Satuan (dropdown) ] [ 🗑 ]
```

- Autocomplete nama makanan dari `food_name_suggestions` view
- User bisa tetap ketik nama baru yang tidak ada di suggestions
- Jumlah: input numerik
- Satuan: dropdown dari tabel `food_units`
- Tombol "+ Tambah makanan" untuk baris baru

**Tombol "Analisa & Simpan":**
1. Validasi: minimal 1 baris terisi
2. Tampilkan loading state: "Sedang menganalisa kalori..."
3. Kirim ke OpenAI API (lihat bagian OpenAI di bawah)
4. Setelah response diterima → auto-save ke Supabase (tidak ada konfirmasi tambahan)
5. Tampilkan hasil: tabel read-only dengan kalori per item + total
6. Tampilkan disclaimer kalori (lihat bagian Disclaimer)
7. Form di-reset untuk entry waktu makan berikutnya

**Error handling:**
- Jika OpenAI gagal → tampilkan pesan error merah, data TIDAK disimpan, user bisa coba lagi
- Jika Supabase gagal simpan → tampilkan error, log ke console

---

### KLIEN — Log Makan (`/klien/log`)

- Tampilan tabel dikelompokkan per 10 hari (pagination)
- Kolom: Tanggal | Pagi (kal) | Siang (kal) | Malam (kal) | Snack (kal) | Total | Detail
- Sel yang belum dientry tampil sebagai "-"
- Tombol "Detail" → modal dialog:
  - Header: tanggal + total kalori hari itu
  - Tab per waktu makan
  - Tabel: Nama Makanan | Jumlah | Satuan | Estimasi Kalori
  - Footer disclaimer

---

### KLIEN — Progress (`/klien/progress`)

- Grafik line chart: BB, BMI, massa otot, massa lemak (toggle per metrik)
- Tabel history measurement (read-only)
- Rentang waktu: 30 hari / 3 bulan / semua data

---

## OPENAI INTEGRATION

File: `src/lib/openai.js`

```javascript
export async function estimateCalories(items) {
  // items: [{ nama_makanan, jumlah, unit_nama }]
  
  const prompt = `
Kamu adalah ahli gizi. Estimasi kalori untuk setiap makanan berikut.
Berikan response HANYA dalam format JSON array, tanpa teks lain.

Format response:
[
  { "nama_makanan": "...", "kalori": 123 },
  ...
]

Data makanan:
${items.map((item, i) => 
  `${i+1}. ${item.nama_makanan} - ${item.jumlah} ${item.unit_nama}`
).join('\n')}

Gunakan estimasi kalori yang umum untuk makanan Indonesia.
Jika makanan tidak dikenal, estimasi berdasarkan bahan utama yang paling mungkin.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  
  // Strip markdown jika ada
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
```

---

## DISCLAIMER KALORI

Komponen `CalorieDisclaimer.jsx` — tampilkan di setiap hasil analisa dan halaman log:

```
⚠️ Informasi Kalori — Hanya Estimasi
Nilai kalori yang ditampilkan adalah estimasi awal berdasarkan analisa AI
dan tidak menggantikan penilaian klinis. Untuk konfirmasi lebih lanjut
mengenai kebutuhan gizi Anda, silakan konsultasikan dengan Ahli Gizi
di instalasi Anda.
```

Style: card dengan background kuning muda, border kuning, icon warning.

---

## BMI CALCULATOR

File: `src/lib/bmiCalculator.js`

```javascript
export function calculateBMI(beratKg, tinggiCm) {
  const tinggiM = tinggiCm / 100;
  return parseFloat((beratKg / (tinggiM * tinggiM)).toFixed(2));
}

export function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'blue' };
  if (bmi < 23.0) return { label: 'Normal', color: 'green' };     // WHO Asia-Pacific
  if (bmi < 27.5) return { label: 'Overweight', color: 'yellow' };
  return { label: 'Obese', color: 'red' };
}
```

Gunakan threshold WHO Asia-Pacific (bukan threshold global):
- Underweight: < 18.5
- Normal: 18.5 – 22.9
- Overweight: 23.0 – 27.4
- Obese: ≥ 27.5

---

## MIGRASI DATA EXCEL

Buat halaman `/admin/import` dengan fitur:
1. Upload file .xlsx
2. Parse kolom: `nama`, `email`, `instalasi`, `nomor_wa`
3. Preview tabel hasil parsing (dengan validasi: highlight baris yang email-nya invalid)
4. Tombol "Import Semua" → loop: buat Supabase Auth user + insert ke tabel profiles
5. Tampilkan progress bar + log hasil (berhasil X, gagal Y)
6. Download report hasil import (.csv)

Library yang dipakai: `xlsx` (SheetJS) untuk parsing Excel di browser.

---

## ENV VARIABLES

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=
```

---

## CATATAN PENTING UNTUK CURSOR

1. Semua teks UI dalam Bahasa Indonesia
2. Format tanggal: DD MMMM YYYY (contoh: 27 Maret 2026)
3. Format angka: gunakan koma sebagai desimal (1.234,56)
4. Halaman entry antropometri harus optimal untuk tablet landscape — touch target minimum 44px
5. Seluruh UI menggunakan shadcn/ui + Tailwind CSS
6. Gunakan Tanstack Query untuk semua data fetching dari Supabase
7. RLS Supabase harus aktif — jangan bypass dengan service role key di frontend
8. OpenAI key hanya dipanggil dari frontend (tidak ada backend server) — pastikan key di .env dan tidak di-commit ke git
9. Setiap kalori yang tersimpan adalah hasil OpenAI, tidak bisa diedit setelah tersimpan
10. BMI dihitung otomatis di frontend saat input BB dan TB, bukan di database
