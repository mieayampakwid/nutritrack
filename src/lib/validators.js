import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
})

export const userCreateSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(200),
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['admin', 'ahli_gizi', 'klien']),
  phone: z.string().max(50).optional(),
  tgl_lahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional().or(z.literal('')),
  instalasi: z.string().max(200).optional(),
})

export const registerSchema = z
  .object({
    nama: z.string().min(1, 'Nama wajib diisi').max(200),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
    konfirmasiPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
    tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
    jenisKelamin: z.enum(['male', 'female'], { required_error: 'Pilih jenis kelamin' }),
    beratBadan: z.coerce.number().min(10, 'Minimal 10 kg').max(300, 'Maksimal 300 kg'),
    tinggiBadan: z.coerce.number().min(50, 'Minimal 50 cm').max(250, 'Maksimal 250 cm'),
    role: z.enum(['klien', 'ahli_gizi'], { required_error: 'Pilih peran' }),
  })
  .refine((d) => d.password === d.konfirmasiPassword, {
    message: 'Password tidak cocok',
    path: ['konfirmasiPassword'],
  })

export const foodEntryItemSchema = z.object({
  nama_makanan: z.string().min(1, 'Nama makanan wajib diisi').max(100),
  jumlah: z.number().positive('Jumlah harus lebih dari 0').max(10000, 'Jumlah terlalu besar'),
  unit_nama: z.string().min(1, 'Satuan wajib dipilih'),
})

export const foodEntrySchema = z.object({
  items: z.array(foodEntryItemSchema).min(1, 'Minimal 1 makanan'),
})

export const bodyMeasurementSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  berat_badan: z.number().positive().max(500).optional().nullable(),
  tinggi_badan: z.number().positive().max(300).optional().nullable(),
  massa_otot: z.number().min(0).max(200).optional().nullable(),
  massa_lemak: z.number().min(0).max(100).optional().nullable(),
  lingkar_pinggang: z.number().min(0).max(300).optional().nullable(),
  catatan: z.string().max(1000).optional(),
})

export const groupCreateSchema = z.object({
  nama: z.string().min(1, 'Nama grup wajib diisi').max(100),
  ahli_gizi_id: z.string().uuid('Pilih ahli gizi'),
})
