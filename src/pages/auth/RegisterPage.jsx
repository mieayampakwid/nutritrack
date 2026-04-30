import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { registerSchema } from '@/lib/validators'
import laperLogo from '@/assets/laper-logo.png'

const inputClass =
  'h-8 border-border/70 bg-background/80 px-2.5 py-1 text-sm shadow-sm placeholder:text-muted-foreground/80 file:text-sm focus-visible:ring-1 focus-visible:ring-offset-0'

function RegisterChrome({ children }) {
  return (
    <div className="app-hero-split-bg app-hero-split-bg--full flex min-h-dvh flex-col items-center overflow-y-auto px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-3 sm:max-w-xl">
        <div className="flex w-full flex-col items-center px-1">
          <img
            src={laperLogo}
            alt="LAPER"
            className="block h-auto w-full max-w-56 object-contain sm:max-w-62"
            width={400}
            height={100}
            decoding="async"
          />
        </div>
        {children}
      </div>
    </div>
  )
}

export function RegisterPage() {
  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
    konfirmasiPassword: '',
    tanggalLahir: '',
    jenisKelamin: '',
    beratBadan: '',
    tinggiBadan: '',
    nomorWa: '',
    role: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showKonfirmasi, setShowKonfirmasi] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  if (!isSupabaseConfigured()) {
    return (
      <RegisterChrome>
        <Card className="border border-border/50 shadow-xl shadow-primary/5">
          <CardContent className="px-8 pb-8 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Supabase belum dikonfigurasi. Salin <code className="text-xs">.env.example</code> ke{' '}
              <code className="text-xs">.env</code> dan isi URL serta anon key.
            </p>
          </CardContent>
        </Card>
      </RegisterChrome>
    )
  }

  if (sent) {
    return (
      <RegisterChrome>
        <div className="animate-card-in">
          <Card className="border border-border/55 bg-card/95 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.18)]">
            <CardContent className="flex flex-col items-center gap-4 px-8 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-bold tracking-tight">Cek email kamu</h1>
                <p className="text-sm text-muted-foreground">
                  Kami telah mengirimkan tautan konfirmasi ke{' '}
                  <span className="font-medium text-foreground">{form.email}</span>. Buka email dan
                  klik tautan tersebut untuk mengaktifkan akun.
                </p>
              </div>
              <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                Kembali ke halaman masuk
              </Link>
            </CardContent>
          </Card>
        </div>
      </RegisterChrome>
    )
  }

  function setField(key) {
    return (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      beratBadan: form.beratBadan === '' ? undefined : Number(form.beratBadan),
      tinggiBadan: form.tinggiBadan === '' ? undefined : Number(form.tinggiBadan),
    }
    const result = registerSchema.safeParse(payload)
    if (!result.success) {
      const fieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      toast.error(result.error.issues[0].message)
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          nama: form.nama.trim(),
          role: form.role,
          tgl_lahir: form.tanggalLahir,
          jenis_kelamin: form.jenisKelamin,
          berat_badan: String(form.beratBadan),
          tinggi_badan: String(form.tinggiBadan),
          nomor_wa: form.nomorWa.trim(),
          phone_whatsapp: form.nomorWa.trim(),
        },
      },
    })
    setBusy(false)

    if (error) {
      if (error.message.includes('already registered') || error.code === 'user_already_exists') {
        toast.error('Email sudah terdaftar')
        setErrors((e) => ({ ...e, email: 'Email sudah terdaftar' }))
      } else {
        toast.error(error.message)
      }
    } else {
      setSent(true)
    }
  }

  return (
    <RegisterChrome>
      <div className="animate-card-in">
        <Card className="overflow-hidden rounded-xl border border-border/55 bg-card/95 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.18)] ring-1 ring-black/3 dark:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.45)] dark:ring-white/6">
          <CardContent className="px-4 pb-5 pt-3 sm:px-5">
            <div className="mb-3 text-center">
              <h1 className="text-lg font-bold tracking-tight">Buat Akun Baru</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Isi data berikut untuk mendaftar
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-xs font-medium text-muted-foreground">
                  Nama Lengkap
                </Label>
                <Input
                  id="nama"
                  type="text"
                  autoComplete="name"
                  value={form.nama}
                  onChange={setField('nama')}
                  placeholder="Nama lengkap kamu"
                  className={cn(inputClass, errors.nama && 'border-destructive')}
                  autoFocus
                />
                {errors.nama && <p className="text-xs text-destructive">{errors.nama}</p>}
              </div>

              {/* Tanggal Lahir */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Tanggal Lahir</Label>
                <DatePicker
                  value={form.tanggalLahir}
                  onChange={(v) => {
                    setForm((f) => ({ ...f, tanggalLahir: v }))
                    setErrors((e) => ({ ...e, tanggalLahir: undefined }))
                  }}
                  placeholder="Pilih tanggal lahir"
                />
                {errors.tanggalLahir && (
                  <p className="text-xs text-destructive">{errors.tanggalLahir}</p>
                )}
              </div>

              {/* Jenis Kelamin */}
              <fieldset className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Jenis Kelamin</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="jenisKelamin"
                      value="male"
                      checked={form.jenisKelamin === 'male'}
                      onChange={setField('jenisKelamin')}
                      className="accent-primary"
                    />
                    Laki-laki
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="jenisKelamin"
                      value="female"
                      checked={form.jenisKelamin === 'female'}
                      onChange={setField('jenisKelamin')}
                      className="accent-primary"
                    />
                    Perempuan
                  </label>
                </div>
                {errors.jenisKelamin && (
                  <p className="text-xs text-destructive">{errors.jenisKelamin}</p>
                )}
              </fieldset>

              {/* Berat & Tinggi Badan */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="beratBadan" className="text-xs font-medium text-muted-foreground">
                    Berat Badan (kg)
                  </Label>
                  <Input
                    id="beratBadan"
                    type="number"
                    inputMode="decimal"
                    min={10}
                    max={300}
                    step="0.1"
                    value={form.beratBadan}
                    onChange={setField('beratBadan')}
                    placeholder="70"
                    className={cn(inputClass, errors.beratBadan && 'border-destructive')}
                  />
                  {errors.beratBadan && (
                    <p className="text-xs text-destructive">{errors.beratBadan}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tinggiBadan" className="text-xs font-medium text-muted-foreground">
                    Tinggi Badan (cm)
                  </Label>
                  <Input
                    id="tinggiBadan"
                    type="number"
                    inputMode="decimal"
                    min={50}
                    max={250}
                    step="0.1"
                    value={form.tinggiBadan}
                    onChange={setField('tinggiBadan')}
                    placeholder="170"
                    className={cn(inputClass, errors.tinggiBadan && 'border-destructive')}
                  />
                  {errors.tinggiBadan && (
                    <p className="text-xs text-destructive">{errors.tinggiBadan}</p>
                  )}
                </div>
              </div>

              {/* Nomor WhatsApp */}
              <div className="space-y-1.5">
                <Label htmlFor="nomorWa" className="text-xs font-medium text-muted-foreground">
                  Nomor WhatsApp
                </Label>
                <Input
                  id="nomorWa"
                  type="tel"
                  autoComplete="tel"
                  value={form.nomorWa}
                  onChange={setField('nomorWa')}
                  placeholder="+6281234567890"
                  className={cn(inputClass, errors.nomorWa && 'border-destructive')}
                />
                {errors.nomorWa && <p className="text-xs text-destructive">{errors.nomorWa}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder="nama@contoh.com"
                  className={cn(
                    inputClass,
                    'placeholder:text-[0.6875rem] placeholder:leading-normal',
                    errors.email && 'border-destructive',
                  )}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={setField('password')}
                    placeholder="Minimal 6 karakter"
                    className={cn(inputClass, 'pr-9', errors.password && 'border-destructive')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-0 flex h-full items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="konfirmasiPassword"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Konfirmasi Kata Sandi
                </Label>
                <div className="relative">
                  <Input
                    id="konfirmasiPassword"
                    type={showKonfirmasi ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.konfirmasiPassword}
                    onChange={setField('konfirmasiPassword')}
                    placeholder="Ulangi kata sandi"
                    className={cn(
                      inputClass,
                      'pr-9',
                      errors.konfirmasiPassword && 'border-destructive',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKonfirmasi((v) => !v)}
                    className="absolute right-0 top-0 flex h-full items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                    aria-label={
                      showKonfirmasi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                    }
                  >
                    {showKonfirmasi ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {errors.konfirmasiPassword && (
                  <p className="text-xs text-destructive">{errors.konfirmasiPassword}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-medium text-muted-foreground">
                  Daftar Sebagai
                </Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={setField('role')}
                  className={cn(
                    'flex h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    errors.role && 'border-destructive',
                  )}
                >
                  <option value="">— Pilih peran —</option>
                  <option value="klien">Klien</option>
                  <option value="ahli_gizi">Ahli Gizi</option>
                </select>
                {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
              </div>

              <Button type="submit" className="mt-1 w-full text-sm font-semibold" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Mendaftar…
                  </>
                ) : (
                  'Daftar'
                )}
              </Button>
            </form>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Masuk
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </RegisterChrome>
  )
}
