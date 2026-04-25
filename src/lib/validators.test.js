import { describe, expect, it } from 'vitest'
import { loginSchema, userCreateSchema, foodEntrySchema, foodEntryItemSchema, bodyMeasurementSchema } from './validators'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com', password: '123456' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-email', password: '123456' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('email')
    }
  })

  it('rejects password shorter than 6 chars', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com', password: '12345' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('6')
    }
  })
})

describe('userCreateSchema', () => {
  it('accepts valid full object', () => {
    const result = userCreateSchema.safeParse({
      nama: 'Budi',
      email: 'budi@test.com',
      role: 'klien',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing nama', () => {
    const result = userCreateSchema.safeParse({ email: 'budi@test.com', role: 'klien' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = userCreateSchema.safeParse({
      nama: 'Budi',
      email: 'budi@test.com',
      role: 'hacker',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields omitted', () => {
    const result = userCreateSchema.safeParse({
      nama: 'Budi',
      email: 'budi@test.com',
      role: 'admin',
    })
    expect(result.success).toBe(true)
  })
})

describe('foodEntryItemSchema', () => {
  it('accepts valid item', () => {
    const result = foodEntryItemSchema.safeParse({
      nama_makanan: 'Nasi goreng',
      jumlah: 1,
      unit_nama: 'porsi',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty nama_makanan', () => {
    const result = foodEntryItemSchema.safeParse({
      nama_makanan: '',
      jumlah: 1,
      unit_nama: 'porsi',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero jumlah', () => {
    const result = foodEntryItemSchema.safeParse({
      nama_makanan: 'Nasi',
      jumlah: 0,
      unit_nama: 'porsi',
    })
    expect(result.success).toBe(false)
  })

  it('rejects jumlah exceeding max', () => {
    const result = foodEntryItemSchema.safeParse({
      nama_makanan: 'Nasi',
      jumlah: 10001,
      unit_nama: 'porsi',
    })
    expect(result.success).toBe(false)
  })
})

describe('foodEntrySchema', () => {
  it('accepts non-empty items array', () => {
    const result = foodEntrySchema.safeParse({
      items: [{ nama_makanan: 'Nasi', jumlah: 1, unit_nama: 'porsi' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty items array', () => {
    const result = foodEntrySchema.safeParse({ items: [] })
    expect(result.success).toBe(false)
  })
})

describe('bodyMeasurementSchema', () => {
  it('accepts valid full object', () => {
    const result = bodyMeasurementSchema.safeParse({
      tanggal: '2025-01-15',
      berat_badan: 70,
      tinggi_badan: 170,
      massa_otot: 30,
      massa_lemak: 20,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = bodyMeasurementSchema.safeParse({
      tanggal: '15-01-2025',
      berat_badan: 70,
      tinggi_badan: 170,
    })
    expect(result.success).toBe(false)
  })

  it('accepts nullable optional fields', () => {
    const result = bodyMeasurementSchema.safeParse({
      tanggal: '2025-01-15',
      berat_badan: null,
      tinggi_badan: null,
      massa_otot: null,
      massa_lemak: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects berat_badan exceeding max', () => {
    const result = bodyMeasurementSchema.safeParse({
      tanggal: '2025-01-15',
      berat_badan: 501,
    })
    expect(result.success).toBe(false)
  })
})
