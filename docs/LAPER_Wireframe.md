# LAPER — UI Wireframe Specification
*Mobile-first. All screens designed for 390px viewport width (iPhone 14 baseline).*
*Layout described top-to-bottom. All measurements in px unless noted.*

---

## Design Tokens

| Token | Value |
|-------|-------|
| Primary color | `#2D6A4F` (green) |
| Accent color | `#E76F51` (orange) |
| Danger color | `#E63946` (red) |
| Background | `#F8F9FA` |
| Card background | `#FFFFFF` |
| Text primary | `#212529` |
| Text secondary | `#6C757D` |
| Border radius | `12px` |
| Card padding | `16px` |
| Screen padding | `16px` horizontal |
| Bottom nav height | `64px` |
| Font | System default (Inter / SF Pro) |

---

## Navigation Structure

### User — Bottom Navigation (4 tabs)
```
[ Dashboard ] [ Log Makanan ] [ Progress ] [ Profil ]
```

### Ahli Gizi — Bottom Navigation (3 tabs)
```
[ Dashboard ] [ Peserta ] [ Profil ]
```

### Admin — Bottom Navigation (3 tabs)
```
[ Dashboard ] [ Pengguna ] [ Export ]
```

---

## S-01 — Register
**Route:** `/register`

```
┌─────────────────────────────┐
│  [Logo LAPER 120x40]        │
│                             │
│  Daftar Akun                │  ← h2, text-primary
│  Isi data diri kamu         │  ← text-secondary
│                             │
│  ┌───────────────────────┐  │
│  │ Nama Lengkap          │  │  ← input
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Email                 │  │  ← input
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Password              │  │  ← input password
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Tanggal Lahir         │  │  ← date picker
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Jenis Kelamin    ▼    │  │  ← dropdown: Laki-laki / Perempuan
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Nomor WhatsApp        │  │  ← input tel, prefix +62
│  └───────────────────────┘  │
│                             │
│  Daftar sebagai:            │  ← label
│  ◉ User    ○ Ahli Gizi     │  ← radio group
│                             │
│  ┌───────────────────────┐  │
│  │      DAFTAR           │  │  ← primary button, full width
│  └───────────────────────┘  │
│                             │
│  Sudah punya akun? Masuk    │  ← link to /login
└─────────────────────────────┘
```

---

## S-02 — Login
**Route:** `/login`

```
┌─────────────────────────────┐
│  [Logo LAPER 120x40]        │
│                             │
│  Masuk                      │  ← h2
│                             │
│  ┌───────────────────────┐  │
│  │ Email                 │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Password           👁 │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │       MASUK           │  │  ← primary button
│  └───────────────────────┘  │
│                             │
│  Belum punya akun? Daftar   │  ← link to /register
└─────────────────────────────┘
```

---

## S-03 — Pending Approval
**Route:** `/pending`

```
┌─────────────────────────────┐
│                             │
│        ⏳                   │  ← large icon, centered
│                             │
│  Menunggu Persetujuan       │  ← h2, centered
│                             │
│  Akun kamu sedang dalam     │
│  proses verifikasi oleh     │
│  admin. Kamu akan bisa      │
│  masuk setelah disetujui.   │  ← body text, centered
│                             │
│  ┌───────────────────────┐  │
│  │      KELUAR           │  │  ← secondary button
│  └───────────────────────┘  │
└─────────────────────────────┘
```

---

## S-04 — Dashboard — User
**Route:** `/dashboard`

```
┌─────────────────────────────┐
│ LAPER          🔔  👤       │  ← topbar: logo, notif bell, avatar
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  [AD BANNER 600×300]    │ │  ← carousel, auto-rotate 5s
│ │  ○ ● ○                  │ │  ← dot indicator
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Halo, Budi 👋               │  ← greeting
│ Selasa, 1 Mei 2026          │  ← date
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Kalori Hari Ini         │ │  ← card
│ │ 1.240 / 2.187 kkal      │ │  ← consumed / target
│ │ ████████░░░░  57%       │ │  ← progress bar
│ │ Sisa: 947 kkal          │ │  ← remaining
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Log Makanan Hari Ini        │  ← section title
│ ┌─────────────────────────┐ │
│ │ 🍚 Nasi Goreng          │ │
│ │    Sarapan · 450 kkal   │ │
│ ├─────────────────────────┤ │
│ │ 🍜 Rawon                │ │
│ │    Makan Siang · 350kkal│ │
│ ├─────────────────────────┤ │
│ │ 🧃 Jus Jeruk            │ │
│ │    Snack · 120 kkal     │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Kalori Mingguan             │  ← section title
│ [7H] [14H] [30H] [custom]  │  ← timeframe tabs
│ ┌─────────────────────────┐ │
│ │  Bar chart              │ │
│ │  - - - - - - - - - - -  │ │  ← red dotted calorie limit line
│ │  ▓ ▓ ▓ ▓ ▓ ▓ ▓         │ │  ← bars per day
│ │  S S R K J S M          │ │  ← day labels
│ └─────────────────────────┘ │
│ — — Batas Kalori: 2.187 kkal│  ← legend for red line
├─────────────────────────────┤
│ Trending Hari Ini 🔥        │  ← section title
│ [Hari Ini] [7H] [30H]      │  ← timeframe tabs
│ ┌─────────────────────────┐ │
│ │ 1. Nasi Putih    · 124x │ │
│ │ 2. Ayam Goreng   · 98x  │ │
│ │ 3. Mie Goreng    · 87x  │ │
│ │ 4. Rawon         · 65x  │ │
│ │ 5. Tempe Goreng  · 54x  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [Dashboard][Log][Progress][👤]│ ← bottom nav
└─────────────────────────────┘
```

---

## S-05 — Dashboard — Ahli Gizi
**Route:** `/dashboard`

```
┌─────────────────────────────┐
│ LAPER (AG)     🔔  👤       │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  [AD BANNER 600×300]    │ │
│ │  ○ ● ○                  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Halo, dr. Siti 👋           │
│ Selasa, 1 Mei 2026          │
├─────────────────────────────┤
│ ⚠️ Perlu Evaluasi (3)       │  ← warning card, tap to go to S-16
│ ┌─────────────────────────┐ │
│ │ Budi S.    · 18 hari    │ │
│ │ Ani R.     · 21 hari    │ │
│ │ Citra M.   · 15 hari    │ │
│ └─────────────────────────┘ │
│ Lihat semua peserta →       │
├─────────────────────────────┤
│ Trending Hari Ini 🔥        │
│ [Hari Ini] [7H] [30H]      │
│ ┌─────────────────────────┐ │
│ │ 1. Nasi Putih    · 124x │ │
│ │ 2. Ayam Goreng   · 98x  │ │
│ │ 3. Mie Goreng    · 87x  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [Dashboard][Peserta][👤]    │
└─────────────────────────────┘
```

---

## S-06 — Dashboard — Admin
**Route:** `/dashboard`

```
┌─────────────────────────────┐
│ LAPER (Admin)  🔔  👤       │
├─────────────────────────────┤
│ Halo, Admin 👋              │
│ Selasa, 1 Mei 2026          │
├─────────────────────────────┤
│ ┌──────────┐ ┌────────────┐ │
│ │ Total    │ │ Menunggu   │ │  ← stat cards
│ │ 142 User │ │ 5 Approval │ │
│ └──────────┘ └────────────┘ │
│ ┌───────────────────────┐   │
│ │  KELOLA PENGGUNA  →   │   │  ← button to S-17
│ └───────────────────────┘   │
├─────────────────────────────┤
│ Trending Hari Ini 🔥        │
│ [Hari Ini] [7H] [30H]      │
│ ┌─────────────────────────┐ │
│ │ 1. Nasi Putih    · 124x │ │
│ │ 2. Ayam Goreng   · 98x  │ │
│ │ 3. Mie Goreng    · 87x  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [Dashboard][Pengguna][Export]│
└─────────────────────────────┘
```

---

## S-07 — Food Log Entry
**Route:** `/food-log/new`

```
┌─────────────────────────────┐
│ ← Log Makanan               │  ← back button, screen title
├─────────────────────────────┤
│ Kategori Makan              │  ← label
│ [Sarapan][Makan Siang]      │
│ [Makan Malam][Snack]        │  ← pill selector, single select
├─────────────────────────────┤
│ Tambah Makanan              │  ← section title
│ ┌───────────────────────┐   │
│ │ Nama makanan...       │   │  ← text input
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │  + TAMBAH KE DAFTAR   │   │  ← secondary button
│ └───────────────────────┘   │
├─────────────────────────────┤
│ Daftar Makanan (2 item)     │  ← section title, item count
│ ┌─────────────────────────┐ │
│ │ Rawon                   │ │
│ │ Menunggu hasil AI...    │ │  ← loading state
│ │                    [✕]  │ │  ← remove button
│ ├─────────────────────────┤ │
│ │ Nasi Putih              │ │
│ │ 242 kkal · P:4g K:53g  │ │  ← AI result shown inline
│ │ L:0.4g                  │ │
│ │                    [✕]  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │       SUBMIT          │   │  ← primary button, disabled if 0 items
│ └───────────────────────┘   │
│ * Input vague akan memunculkan│
│   dialog klarifikasi sebelum │
│   ditambahkan ke daftar      │
└─────────────────────────────┘
```

---

## S-08 — Food Log Receipt
**Route:** `/food-log/receipt`

```
┌─────────────────────────────┐
│ ← Hasil Log Makanan         │
├─────────────────────────────┤
│        ✅                   │  ← success icon, centered
│   Makanan berhasil dicatat! │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  STRUK KALORI           │ │  ← receipt card
│ │  Makan Siang            │ │  ← meal category
│ │  Sel, 1 Mei · 12:34     │ │  ← timestamp
│ │ ─────────────────────── │ │
│ │  Rawon           350kkal│ │
│ │  P: 18g K: 30g L: 12g   │ │
│ │ ─────────────────────── │ │
│ │  Nasi Putih      242kkal│ │
│ │  P: 4g  K: 53g  L: 0.4g │ │
│ │ ─────────────────────── │ │
│ │  TOTAL           592kkal│ │  ← bold
│ │  P: 22g K: 83g L: 12.4g │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │   LOG LAGI            │   │  ← secondary button → S-07
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │   KE DASHBOARD        │   │  ← primary button → S-04
│ └───────────────────────┘   │
└─────────────────────────────┘
```

---

## S-09 — Progress Page
**Route:** `/progress`

```
┌─────────────────────────────┐
│ ← Progress Saya             │
├─────────────────────────────┤
│ Riwayat Log Makanan         │  ← section title
│ [7H] [30H] [3B] [Custom]   │  ← timeframe tabs
│ ┌─────────────────────────┐ │
│ │ Sel, 1 Mei 2026         │ │  ← date group header
│ │  Rawon · Makan Siang    │ │
│ │  350 kkal               │ │
│ │  Nasi Putih · Makan Siang│ │
│ │  242 kkal               │ │
│ ├─────────────────────────┤ │
│ │ Sen, 30 Apr 2026        │ │
│ │  Gado-gado · Sarapan    │ │
│ │  310 kkal               │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Riwayat Evaluasi Gizi       │  ← section title
│ ┌─────────────────────────┐ │
│ │ 📋 Evaluasi #3          │ │
│ │ 1 Mei 2026              │ │
│ │ BMI: 25.1 · 2.187 kkal  │ │
│ │              Lihat →    │ │  ← link to evaluation detail
│ ├─────────────────────────┤ │
│ │ 📋 Evaluasi #2          │ │
│ │ 15 Apr 2026             │ │
│ │ BMI: 25.8 · 2.210 kkal  │ │
│ │              Lihat →    │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Grafik Progres Fisik        │  ← section title
│ [BB/TB][BMI][Lemak][Otot]  │  ← metric tabs
│ ┌─────────────────────────┐ │
│ │  Line chart per metric  │ │
│ │  per assessment session │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [Dashboard][Log][Progress][👤]│
└─────────────────────────────┘
```

---

## S-10 — Exercise Log
**Route:** `/exercise-log`  
*(accessible via Profile tab → Log Olahraga)*

```
┌─────────────────────────────┐
│ ← Log Olahraga              │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ Jenis Olahraga        │   │  ← text input
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Durasi (menit)        │   │  ← number input
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │   SIMPAN OLAHRAGA     │   │  ← primary button
│ └───────────────────────┘   │
├─────────────────────────────┤
│ Riwayat Olahraga            │  ← section title
│ ┌─────────────────────────┐ │
│ │ Jogging · 30 menit      │ │
│ │ Sel, 1 Mei · 07:00      │ │
│ ├─────────────────────────┤ │
│ │ Renang · 45 menit       │ │
│ │ Sen, 30 Apr · 06:30     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## S-11 — User Profile View
**Route:** `/profile/:id`

```
┌─────────────────────────────┐
│ ← Profil                    │
│                    [Edit] ✏ │  ← Edit button visible ONLY for ahli_gizi/admin
├─────────────────────────────┤
│     [Avatar 72x72]          │  ← initials avatar, centered
│     Budi Santoso            │  ← name
│     user · Disetujui ✅     │  ← role + approval status
├─────────────────────────────┤
│ Data Pribadi                │  ← section
│ Email        budi@mail.com  │
│ Tgl Lahir    15 Apr 1990    │
│ Usia         36 tahun       │
│ Jenis Kelamin Laki-laki     │
│ WhatsApp     +62812...      │
├─────────────────────────────┤
│ Data Terkini (Asesmen)      │  ← from latest assessment_session
│ BB           68.5 kg        │
│ TB           165 cm         │
│ BMI          25.2 (Overweight)│
│ Lingkar Perut 82 cm         │
│ Massa Otot   28.3 kg        │
│ Massa Lemak  18.1 kg        │
│ Kebutuhan Kalori 2.187 kkal │
├─────────────────────────────┤
│ Grafik Progres Fisik        │  ← same as S-09 chart section
│ [BB/TB][BMI][Lemak][Otot]  │
│ ┌─────────────────────────┐ │
│ │  Line chart             │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Riwayat Perubahan Data      │  ← visible only to ahli_gizi/admin
│ ┌─────────────────────────┐ │
│ │ BB: 70.2 → 68.5 kg      │ │
│ │ oleh dr.Siti · 1 Mei    │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## S-12 — Assessment Form
**Route:** `/assessment/:userId`

```
┌─────────────────────────────┐
│ ← Asesmen: Budi Santoso     │
│ Sesi ke-4 · 1 Mei 2026      │
├─────────────────────────────┤
│ Data Wajib Diisi            │  ← section label
│ ┌───────────────────────┐   │
│ │ Berat Badan (kg)      │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Tinggi Badan (cm)     │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Tingkat Aktivitas  ▼  │   │  ← dropdown
│ └───────────────────────┘   │
├─────────────────────────────┤
│ Data Tambahan               │  ← section label
│ ┌───────────────────────┐   │
│ │ Lingkar Perut (cm)    │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Massa Otot (kg)       │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Massa Lemak (kg)      │   │
│ └───────────────────────┘   │
├─────────────────────────────┤
│ Hasil Kalkulasi (otomatis)  │  ← live preview, updates on input
│ ┌─────────────────────────┐ │
│ │ BMI           25.2      │ │
│ │ Status        Overweight│ │
│ │ Kebutuhan Kalori        │ │
│ │               2.187 kkal│ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │  SIMPAN & LANJUT      │   │  ← primary button → S-13
│ └───────────────────────┘   │
└─────────────────────────────┘
```

---

## S-13 — Evaluation Form
**Route:** `/evaluation/:userId`

```
┌─────────────────────────────┐
│ ← Evaluasi: Budi Santoso    │
│ Sesi ke-4 · 1 Mei 2026      │
├─────────────────────────────┤
│ Ringkasan Asesmen           │  ← read-only summary from S-12
│ BB: 68.5 kg · TB: 165 cm   │
│ BMI: 25.2 · 2.187 kkal/hari│
├─────────────────────────────┤
│ Log Olahraga (2 minggu ini) │  ← from exercise_logs
│ Jogging 30 mnt · 1 Mei     │
│ Renang 45 mnt · 28 Apr      │
├─────────────────────────────┤
│ Catatan Evaluasi            │  ← section label
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │  Tulis catatan...       │ │  ← textarea, min 3 rows
│ │                         │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │    SUBMIT EVALUASI    │   │  ← primary button
│ └───────────────────────┘   │
│                             │
│ ── setelah submit ──        │
│                             │
│ ┌───────────────────────┐   │
│ │  📤 SHARE KE WHATSAPP │   │  ← appears after submit
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │  📄 DOWNLOAD PDF      │   │  ← generates PDF client-side
│ └───────────────────────┘   │
└─────────────────────────────┘
```

---

## S-14 — Evaluation History (Ahli Gizi View)
**Route:** `/evaluation/:userId/history`

```
┌─────────────────────────────┐
│ ← Riwayat Evaluasi          │
│ Budi Santoso                │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 📋 Sesi #4 · 1 Mei 2026 │ │
│ │ BMI: 25.2               │ │
│ │ Kalori: 2.187 kkal      │ │
│ │ BB: 68.5 · TB: 165      │ │
│ │           Lihat Detail →│ │  ← opens evaluation detail page
│ ├─────────────────────────┤ │
│ │ 📋 Sesi #3 · 15 Apr     │ │
│ │ BMI: 25.8               │ │
│ │ Kalori: 2.210 kkal      │ │
│ │           Lihat Detail →│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Evaluation Detail Page (linked from history)
```
┌─────────────────────────────┐
│ ← Detail Evaluasi #4        │
│ 1 Mei 2026 · dr. Siti       │
├─────────────────────────────┤
│ DATA ANTROPOMETRI           │  ← section, styled like medical report
│ Berat Badan     68.5 kg     │
│ Tinggi Badan    165 cm      │
│ BMI             25.2        │
│ Status Gizi     Overweight  │
│ Lingkar Perut   82 cm       │
│ Massa Otot      28.3 kg     │
│ Massa Lemak     18.1 kg     │
├─────────────────────────────┤
│ KEBUTUHAN KALORI            │
│ 2.187 kkal/hari             │
│ (Lightly Active)            │
├─────────────────────────────┤
│ CATATAN EVALUASI            │
│ Berat badan turun 1.5kg...  │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │  📤 SHARE WHATSAPP    │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │  📄 DOWNLOAD PDF      │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

---

## S-15 — Evaluation History (User View)
**Route:** `/my-evaluations`  
*(same list layout as S-14 but read-only, no share/PDF buttons per item — only on detail page)*

---

## S-16 — Participant List (Ahli Gizi)
**Route:** `/participants`

```
┌─────────────────────────────┐
│ Peserta              🔍     │  ← screen title, search icon
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ [Semua] [Perlu Evaluasi]│ │  ← filter tabs
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 👤 Budi Santoso         │ │
│ │ Last eval: 1 Mei · ✅   │ │  ← green if < 14 days
│ │              Lihat →    │ │
│ ├─────────────────────────┤ │
│ │ 👤 Ani Rahayu           │ │
│ │ Last eval: 13 Apr · ⚠️  │ │  ← orange/red if overdue
│ │              Lihat →    │ │
│ └─────────────────────────┘ │
│                             │
│ Tap peserta → S-11 (profil) │
│ Tap Evaluasi → S-12 (asesmen)│
└─────────────────────────────┘
```

---

## S-17 — Admin User Management
**Route:** `/admin/users`

```
┌─────────────────────────────┐
│ Manajemen Pengguna    🔍    │
├─────────────────────────────┤
│ [Semua][Pending][Approved]  │  ← filter tabs
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 👤 Budi Santoso         │ │
│ │ user · ✅ Approved      │ │
│ │ [Lihat Profil] [Hapus]  │ │  ← hapus = danger button
│ ├─────────────────────────┤ │
│ │ 👤 Citra Melati         │ │
│ │ user · ⏳ Pending       │ │
│ │ [Setujui ✓] [Tolak ✕]  │ │  ← approval actions
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## S-18 — Admin Export CSV
**Route:** `/admin/export`

```
┌─────────────────────────────┐
│ Export Data                 │
├─────────────────────────────┤
│ Rentang Tanggal             │  ← label
│ ┌───────────────────────┐   │
│ │ Dari: 01/01/2026      │   │  ← date picker
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Sampai: 05/05/2026    │   │  ← date picker
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │   📥 EXPORT CSV       │   │  ← primary button
│ └───────────────────────┘   │
└─────────────────────────────┘
```

---

## Notification Panel (overlay, triggered by 🔔 icon)

```
┌─────────────────────────────┐
│ Notifikasi            Tutup │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🍽 Belum ada log        │ │
│ │ Makan Siang hari ini.   │ │  ← meal_reminder type
│ │ 12:30 · Belum dibaca    │ │
│ ├─────────────────────────┤ │
│ │ ⚠️ Peserta Ani Rahayu   │ │
│ │ belum dievaluasi 21 hr. │ │  ← evaluation_overdue type
│ │ Kemarin · Sudah dibaca  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```
