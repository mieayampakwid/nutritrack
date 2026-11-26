# Current Task

## Status: in-progress

Proyek PWA (keputusan pemilik 26 Nov 2026): web disamakan dengan aplikasi mobile terbaru, lalu dasar PWA dan pengingat. Rencana lengkap ada di Project "Laper App" (`claude/rencana-pwa.md`). Uji hanya di laper-dev dengan akun uji.

## Active Feature

PR 1 — kompatibilitas dengan database yang sudah diperketat (`claude/web-ganti-sandi`):
- Ganti kata sandi wajib saat `profiles.must_change_password` (halaman `/ganti-kata-sandi`, memanggil Edge Function `change-password`); guard di `RequireAuth`, `RootRedirect`, `LoginPage`.
- Lupa kata sandi (`/lupa-kata-sandi`) dan atur ulang (`/atur-ulang-kata-sandi`, tanpa kata sandi lama).
- Menu "Ganti kata sandi" di AppShell (desktop dan menu seluler).
- Daftar mandiri ditutup lewat `SELF_SIGNUP_ENABLED=false` (`src/lib/authConfig.js`); `/register` diarahkan ke `/login`.
- Kuota AI: pesan server (`ai_quota_exceeded`) sudah ditampilkan apa adanya oleh `openai.js`.

## Decisions Made

- Skema, migrasi, dan Edge Function kanonik ada di repo `laperapp-mobile/supabase/`; folder `supabase/` repo ini usang.
- Aturan kata sandi sama dengan mobile (8–72 karakter; login minimal 6).
- Redirect URL web (`/atur-ulang-kata-sandi`) harus ditambahkan pemilik di Supabase Auth sebelum lupa sandi bisa diuji.

## Next Steps

1. PR 2: catat berat mandiri (`klien_log_measurement`, seri "Catatan mandiri").
2. PR 3: template/favorit, tawaran, "Yang baru".
3. PR 4: Jejaring Menu.
4. PR 5: sisa paritas staf (kartu evaluasi jatuh tempo, WhatsApp, lingkup kelompok).
5. PR 6: PWA dasar (manifest, ikon, service worker tanpa data pasien, halaman offline, panduan iPhone).
6. PR 7: pengingat lewat Web Push (VAPID, `send-reminders`, pengaturan, `PUSH_ALLOWED_USER_IDS` di dev).

---

## End of Session

Before ending, complete this section:

- [ ] Status updated (in-progress / blocked / done)
- [ ] Decisions logged with rationale
- [ ] Next steps written for the next agent
- [ ] `progress.md` updated with evidence
- [ ] `feature_list.json` updated if status changed
- [ ] `bash init.sh` passed
- [ ] Changes committed & pushed
