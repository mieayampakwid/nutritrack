# LAPER — Product Backlog & Sprint Plan
*Laporan Asupan dan Evaluasi Rutin*

---

## Epics Overview

| Epic | Nama | Deskripsi |
|------|------|-----------|
| Epic 1 | User Management | Registrasi, autentikasi, manajemen role, approval akses, pembatasan edit profil |
| Epic 2 | Food Logging | Input makanan berbasis AI, multi-item entry, receipt visualization, kategorisasi meal, notifikasi meal, log olahraga |
| Epic 3 | Data Visualization | Dashboard kalori mingguan dengan calorie limit, trending food, chart progres profil, ad banner |
| Epic 4 | Admin & Research | Export CSV, manajemen pengguna oleh admin, akses profil lengkap |
| Epic 5 | Polish & Growth | Fitur lanjutan (favorit, dll) |
| Epic 6 | Nutrition Assessment | Asesmen gizi, reassessment wajib, evaluasi 2 mingguan, notifikasi, share WhatsApp |

---

## Product Backlog

### Epic 1 — User Management

| ID | User Story | Priority | Sprint |
|----|-----------|----------|--------|
| US-01 | As a user, I can register with email, password, name, date of birth, gender, and active WhatsApp number so the system has data needed for nutritional calculations and communication | P1 | Sprint 1 |
| US-02 | As a user, I can log in and log out so I access my own data | P1 | Sprint 1 |
| US-03 | As an admin, I can approve or reject user access after self-registration so I control who enters the system | P1 | Sprint 1 |
| US-22 | As an ahli gizi, I can register/login with a nutritionist role so I have access to participant data | P1 | Sprint 1 |
| US-38 | As a user, I cannot edit my own profile; only admin and ahli gizi can modify user profile data | P1 | Sprint 2 |

### Epic 2 — Food Logging

| ID | User Story | Priority | Sprint |
|----|-----------|----------|--------|
| US-04 | As a user, I can type food in Indonesian and get calorie + macro data from AI | P1 | Sprint 1 |
| US-05 | As a user, I can confirm my entry before submitting to get AI result | P1 | Sprint 1 |
| US-08 | As a user, if my input is vague, I get asked to specify | P2 | Sprint 2 |
| US-13 | As a user, I can categorize each food entry as Sarapan, Makan Siang, Makan Malam, or Snack; and I receive an in-app notification if I have not logged a meal for a given meal time | P2 | Sprint 3 |
| US-42 | As a user, I can add and remove multiple food items dynamically on the food log page before submitting — similar to a cashier entry flow; each item is stored as a separate record in the database | P1 | Sprint 1 |
| US-43 | As a user, after submitting my food entries, I see a receipt-style summary showing calorie and macro breakdown per item and the total for that session | P1 | Sprint 1 |
| US-40 | As a user, I can log my physical activity with type of exercise and duration so it appears in my profile and during nutritionist evaluation | P2 | Sprint 3 |

> **Constraint:** Food log entries are immutable once saved. No role — including admin and ahli gizi — can edit or delete a submitted food entry.

### Epic 3 — Data Visualization

| ID | User Story | Priority | Sprint |
|----|-----------|----------|--------|
| US-10 | As a user, I can see today's food log, today's total calories and macros on my dashboard, and a weekly calorie intake chart with a visible red dotted calorie limit line derived from my most recent assessed calorie needs | P1 | Sprint 1 |
| US-11 | As a user, I can view my calorie consumed log with a flexible timeframe selector; default view shows the last 7 days | P1 | Sprint 1 |
| US-12 | As a user, my daily calorie target is automatically set from the most recent Harris-Benedict assessment result by the nutritionist; I can see remaining calories based on this target | P2 | Sprint 3 |
| US-36 | As a user, I can view an independent chart section in my profile showing the history of changes to BB, TB, massa lemak, massa otot, lingkar perut, and calorie needs over time | P1 | Sprint 4 |
| US-44 | As any logged-in user (user or ahli gizi), I can see a trending food section on my dashboard showing the most frequently logged foods across all users; the timeframe is selectable with default set to today | P2 | Sprint 3 |
| US-45 | As a user, I can access my complete food log history on the Progress page | P2 | Sprint 3 |
| US-46 | As a user or ahli gizi, I see an advertisement carousel banner (600x300px, 3 PNG images) displayed at the top of my dashboard above all other content; admin dashboard does not show this banner | P2 | Sprint 4 |

### Epic 4 — Admin & Research

| ID | User Story | Priority | Sprint |
|----|-----------|----------|--------|
| US-14 | As an admin, I can export all user data as CSV | P2 | Sprint 2 |
| US-15 | As an admin, I can filter CSV export by date range | P2 | Sprint 2 |
| US-16 | As an admin, I can see a list of all registered users | P2 | Sprint 2 |
| US-17 | As an admin, I can delete a user account; ahli gizi does not have this permission | P2 | Sprint 3 |
| US-37 | As an admin or ahli gizi, I can view and edit/update a user's complete profile including meal history, assessment history, evaluation history, exercise log, and all other recorded data; all changes are logged to the database | P1 | Sprint 2 |

### Epic 5 — Polish & Growth

| ID | User Story | Priority | Sprint |
|----|-----------|----------|--------|
| US-18 | As a user, I can save frequently logged foods as favorites | P3 | Sprint 4 |

### Epic 6 — Nutrition Assessment (Ahli Gizi)

| ID | User Story | Priority | Sprint |
|----|-----------|----------|--------|
| US-23 | As an ahli gizi, I can select a participant from the registered user list so I manage their assessment data | P1 | Sprint 2 |
| US-24 | As an ahli gizi, I can input a participant's weight (BB) and height (TB) so their physical data is recorded | P1 | Sprint 2 |
| US-25 | As an ahli gizi, I can see the BMI calculated automatically from BB and TB so I assess their nutritional status | P1 | Sprint 2 |
| US-26 | As an ahli gizi, every evaluation session requires a mandatory reassessment: I must update BB, TB, and activity level so the system recalculates the participant's daily calorie needs using the Harris-Benedict formula | P1 | Sprint 2 |
| US-29 | As an ahli gizi, I can record a participant's activity level (sedentary/lightly active/moderately active/very active) at each assessment session so the Harris-Benedict calculation reflects their current condition | P1 | Sprint 2 |
| US-34 | As an ahli gizi or admin, I can add or update a participant's lingkar perut, massa otot, and massa lemak data; these changes automatically update the participant's profile | P1 | Sprint 2 |
| US-30 | As an ahli gizi, I can write an evaluation note for a participant at any assessment session so my professional observations are recorded | P1 | Sprint 3 |
| US-31 | As an ahli gizi, I can view the full evaluation history of a participant so I track their progress over time | P1 | Sprint 3 |
| US-32 | As a user, I can view my own evaluation history from the nutritionist so I understand my progress and recommendations | P1 | Sprint 3 |
| US-33 | As an ahli gizi, I can only create a new evaluation session if at least 2 weeks have passed since the last session; the system sends an in-app notification to both the ahli gizi and the user when a user has not been evaluated within 2 weeks | P1 | Sprint 3 |
| US-35 | As an admin or ahli gizi, every change to a user's profile data or calorie reassessment is automatically logged with: who made the change, timestamp, old value, and new value | P1 | Sprint 3 |
| US-39 | As an ahli gizi, after submitting an evaluation, I see a "Share ke WhatsApp" button that opens WhatsApp on my device with a pre-composed message containing the participant's updated condition summary and evaluation recommendations, addressed to the participant's registered WhatsApp number | P1 | Sprint 3 |
| US-28 | As an ahli gizi, I can see a history of BB/TB/BMI changes per participant so I evaluate their physical progress | P2 | Sprint 4 |

---

## Tech Debt (V2)

| ID | User Story | Reason |
|----|-----------|--------|
| US-09 | As a user, I can log food with photo/OCR | Deferred — complexity vs sprint capacity |
| US-19 | As a user, I can create meal templates for recurring meals | Deferred — nice to have |
| US-21 | As a user, I can track my weight daily | Deferred — covered partially by ahli gizi assessment flow |
| US-41 | As a user, calorie burned from exercise is calculated and affects net calorie display; exercise types are tracked in detail | V2 — requires exercise database and calorie burn logic |

---

## Sprint Plan

### Sprint 1 — "Minimum Working Tracker"
**Tanggal:** 1 Mei 2026  
**Goal:** User dan ahli gizi dapat mendaftar (dengan approval admin), user mencatat makanan via AI dengan multi-item entry dan receipt visualization, dan melihat ringkasan harian dengan weekly chart.  
**Stories:** US-01, US-02, US-03, US-04, US-05, US-10, US-11, US-22, US-42, US-43

| Waktu | Backend | Frontend |
|-------|---------|----------|
| Pagi | DB schema, multi-role auth, registration + approval flow (US-01, US-02, US-03, US-22) | Auth UI: register, login, pending approval screen |
| Siang | OpenAI integration — multi-item food input → JSON per item (US-04, US-05, US-42) | Food log page: dynamic multi-item cashier-style entry UI + confirmation before submit |
| Sore | Daily summary API + calorie log API with timeframe filter (US-10, US-11); receipt response per session (US-43) | Dashboard: today's food log + today summary + weekly calorie chart + red dotted calorie limit line + timeframe selector; receipt UI post-submit |
| Malam | Integration testing, bug fixes | Bug fixes, demo prep |

**Sprint exit:** Demo — daftar (user & ahli gizi), admin approve, log multi-item makanan, lihat receipt, lihat dashboard dengan today's log + weekly chart.

---

### Sprint 2 — "Data Management & First Assessment"
**Tanggal:** 2 Mei 2026  
**Goal:** Vague input rejection, admin kelola data, ahli gizi input asesmen pertama, profil lengkap visible dan dapat diedit, user tidak bisa edit profil sendiri.  
**Stories:** US-08, US-14, US-15, US-16, US-23, US-24, US-25, US-26, US-29, US-34, US-37, US-38

| Waktu | Backend | Frontend |
|-------|---------|----------|
| Pagi | Vague input rejection (US-08), block user self-edit (US-38) | Food log UI tanpa edit/delete, profil restrictions |
| Siang | Ahli gizi: pilih peserta, input BB/TB/activity/lingkar perut/massa otot/massa lemak, auto BMI + Harris-Benedict (US-23, US-24, US-25, US-26, US-29, US-34) | Assessment form UI, profil user lengkap + edit untuk ahli gizi & admin (US-37) |
| Sore | Admin CSV export + date range filter + user list (US-14, US-15, US-16) | Admin panel: user list, export CSV |
| Malam | Integration testing | Bug fixes, demo prep |

**Sprint exit:** Ahli gizi input asesmen pertama, admin ekspor CSV, profil lengkap visible dan dapat diedit oleh ahli gizi/admin, user tidak bisa edit profil.

---

### Sprint 3 — "Evaluation, Notifications & Sharing"
**Tanggal:** 3 Mei 2026  
**Goal:** Evaluasi 2 mingguan dengan notifikasi, log perubahan data, share WhatsApp, meal categorization, exercise log, trending food, progress page, admin delete user.  
**Stories:** US-12, US-13, US-17, US-30, US-31, US-32, US-33, US-35, US-39, US-40, US-44, US-45

| Waktu | Backend | Frontend |
|-------|---------|----------|
| Pagi | Evaluation notes + 2-week interval enforcement + notification trigger ke ahli gizi & user (US-30, US-33) | Evaluation form UI, notifikasi in-app |
| Siang | Evaluation history API (US-31, US-32), change log system (US-35), food log all history API (US-45) | Ahli gizi & user: tampilan riwayat evaluasi, log perubahan profil, Progress page |
| Sore | WhatsApp share link generator (US-39), meal categorization + meal notification (US-13), exercise log API (US-40), admin delete user (US-17), calorie goal (US-12), trending food API (US-44) | Share button post-submit evaluasi, meal category selector, exercise log page, admin delete UI, trending food section di dashboard |
| Malam | Integration testing | Bug fixes, demo prep |

**Sprint exit:** Evaluasi tercatat, notifikasi berjalan, share WhatsApp berfungsi, meal terkategorisasi, exercise log tersimpan, trending food tampil di dashboard, progress page accessible.

---

### Sprint 4 — "History & Organization"
**Tanggal:** 4 Mei 2026  
**Goal:** Chart progres profil user, histori BB/TB/BMI, favorit makanan, ad banner dashboard.  
**Stories:** US-18, US-28, US-36, US-46

| Waktu | Backend | Frontend |
|-------|---------|----------|
| Pagi | BB/TB/BMI history API per peserta (US-28) | Chart histori BB/TB/BMI untuk ahli gizi |
| Siang | Profile chart data API: BB, TB, massa lemak, massa otot, lingkar perut, calorie needs over time (US-36) | Section chart independen di profil user |
| Sore | Favorites API (US-18) | Favorites UI pada food log; ad carousel banner 600x300px (3 PNG) di top dashboard user & ahli gizi (US-46) |
| Malam | Integration testing | Bug fixes, demo prep |

**Sprint exit:** User & ahli gizi lihat tren fisik lengkap dalam chart, favorit makanan berfungsi, ad banner tampil di dashboard.

---

### Sprint 5 — "Stabilization & Final Polish"
**Tanggal:** 5 Mei 2026  
**Goal:** Full regression testing, performance audit, bug fixes, demo final.  
**Stories:** — (buffer sprint)

| Waktu | Backend | Frontend |
|-------|---------|----------|
| Pagi | Full regression testing seluruh API | Full regression testing seluruh UI flow |
| Siang | Performance audit, fix critical bugs | Fix UI bugs, responsive check |
| Sore | Security audit: RLS, role permissions, data access boundaries | Final polish UI |
| Malam | **Demo final — semua fitur** | **Demo final — semua fitur** |

**Sprint exit:** Produk stabil, semua fitur terverifikasi, siap digunakan.

---

## Roadmap Summary

| Sprint | Tanggal | Goal |
|--------|---------|------|
| Sprint 1 | 1 Mei 2026 | MVP — Register + approval, multi-item AI food entry, receipt visualization, dashboard + weekly chart |
| Sprint 2 | 2 Mei 2026 | Vague input rejection, asesmen pertama, admin CSV, profil lengkap editable, user read-only |
| Sprint 3 | 3 Mei 2026 | Evaluasi 2 mingguan, notifikasi, WhatsApp share, meal kategorisasi, exercise log, trending food, progress page |
| Sprint 4 | 4 Mei 2026 | Chart progres profil, histori BB/TB/BMI, favorit makanan, ad banner dashboard |
| Sprint 5 | 5 Mei 2026 | Regression testing, bug fixes, security audit, demo final |

**Total: 43 user stories • 6 epics • 5 sprints • 5 hari (1–5 Mei 2026)**  
**Tech Debt: 4 stories → V2**

---

## Epic Coverage per Sprint

| Epic | S1 | S2 | S3 | S4 | S5 | Total |
|------|----|----|----|----|-----|-------|
| Epic 1 — User Management | ✓ | ✓ | | | | 5 stories |
| Epic 2 — Food Logging | ✓ | ✓ | ✓ | | | 9 stories |
| Epic 3 — Data Visualization | ✓ | | ✓ | ✓ | | 7 stories |
| Epic 4 — Admin & Research | | ✓ | ✓ | | | 5 stories |
| Epic 5 — Polish & Growth | | | | ✓ | | 1 story |
| Epic 6 — Nutrition Assessment | | ✓ | ✓ | ✓ | | 13 stories |

---

## Assessment Session Flow

```
Sesi Evaluasi (minimal setiap 2 minggu)
│
├── Sistem kirim notifikasi ke ahli gizi & user jika belum evaluasi dalam 2 minggu
│
├── Ahli gizi input reassessment wajib:
│     ├── Update BB, TB, activity level
│     ├── Update lingkar perut, massa otot, massa lemak
│     ├── Sistem hitung ulang BMI otomatis
│     └── Sistem hitung ulang daily calorie needs (Harris-Benedict)
│
├── Ahli gizi tulis catatan evaluasi
│     ├── Tersimpan sebagai log per sesi
│     ├── Semua perubahan data di-log (siapa, kapan, nilai lama → nilai baru)
│     ├── Ahli gizi lihat semua riwayat sesi peserta
│     └── Peserta lihat riwayat evaluasi miliknya sendiri
│
└── Tombol "Share ke WhatsApp"
      └── Pre-composed message → WhatsApp HP ahli gizi → nomor WA peserta
```

## Harris-Benedict Formula — Data Sources

| Data | Diinput oleh | Kapan |
|------|-------------|-------|
| Jenis kelamin | Peserta | Saat registrasi (US-01) |
| Tanggal lahir / usia | Peserta | Saat registrasi (US-01) |
| Nomor WhatsApp | Peserta | Saat registrasi (US-01) |
| BB & TB | Ahli gizi | Tiap sesi evaluasi — wajib (US-26) |
| Activity level | Ahli gizi | Tiap sesi evaluasi — wajib (US-26, US-29) |
| Lingkar perut | Ahli gizi / Admin | Tiap sesi evaluasi (US-34) |
| Massa otot | Ahli gizi / Admin | Tiap sesi evaluasi (US-34) |
| Massa lemak | Ahli gizi / Admin | Tiap sesi evaluasi (US-34) |
| **BMI** | *(otomatis)* | Setelah BB/TB diinput (US-25) |
| **Daily calorie need** | *(otomatis)* | Setelah semua data lengkap (US-26) |

---

## Role Permission Summary

| Fitur | User | Ahli Gizi | Admin |
|-------|------|-----------|-------|
| Register & login | ✓ | ✓ | ✓ |
| Edit / delete food log entry | ✗ | ✗ | ✗ |
| Edit profil sendiri | ✗ | ✗ | ✗ |
| Edit profil user lain | ✗ | ✓ | ✓ |
| Delete user | ✗ | ✗ | ✓ |
| Approve registrasi | ✗ | ✗ | ✓ |
| Input asesmen & evaluasi | ✗ | ✓ | ✗ |
| Lihat profil lengkap semua user | ✗ | ✓ | ✓ |
| Export CSV | ✗ | ✗ | ✓ |
| Log makanan & olahraga | ✓ | ✗ | ✗ |
| Lihat riwayat evaluasi sendiri | ✓ | — | — |
| Share evaluasi via WhatsApp | ✗ | ✓ | ✗ |

---

*Shipping philosophy: Sprint 1–2 = produk yang bisa diluncurkan. Sprint 3–4 = fitur klinis lengkap. Sprint 5 = stabilisasi. Tech Debt V2 dieksekusi setelah feedback pengguna nyata.*
