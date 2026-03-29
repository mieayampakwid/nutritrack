import { useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function randomPassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim())
}

export function ImportData() {
  const [rows, setRows] = useState([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logLines, setLogLines] = useState([])
  const [stats, setStats] = useState({ ok: 0, fail: 0 })

  function parseFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const mapped = json.map((r) => ({
          nama: String(r.nama ?? r.Nama ?? '').trim(),
          email: String(r.email ?? r.Email ?? '').trim(),
          instalasi: String(r.instalasi ?? r.Instalasi ?? '').trim(),
          nomor_wa: String(r.nomor_wa ?? r.nomor_WA ?? r['nomor wa'] ?? '').trim(),
        }))
        setRows(mapped)
        toast.success(`${mapped.length} baris di-parse.`)
      } catch (err) {
        console.error(err)
        toast.error('Gagal membaca file.')
      }
    }
    reader.readAsBinaryString(file)
  }

  async function runImport() {
    const validRows = rows.filter((r) => r.nama && r.email && isValidEmail(r.email))
    if (!validRows.length) {
      toast.error('Tidak ada baris valid untuk diimpor.')
      return
    }
    setRunning(true)
    setProgress(0)
    setLogLines([])
    let ok = 0
    let fail = 0
    const lines = []
    const n = validRows.length
    for (let i = 0; i < n; i++) {
      const r = validRows[i]
      const pw = randomPassword()
      const { error } = await supabase.auth.signUp({
        email: r.email,
        password: pw,
        options: {
          data: {
            nama: r.nama,
            instalasi: r.instalasi || undefined,
            nomor_wa: r.nomor_wa || undefined,
            role: 'klien',
          },
        },
      })
      if (error) {
        fail += 1
        lines.push(`GAGAL,${r.email},${error.message}`)
      } else {
        ok += 1
        lines.push(`OK,${r.email},${pw}`)
      }
      setProgress(Math.round(((i + 1) / n) * 100))
      setStats({ ok, fail })
      setLogLines([...lines])
    }
    setRunning(false)
    toast.message(`Selesai: ${ok} berhasil, ${fail} gagal.`)
  }

  function downloadReport() {
    const header = 'status,email,catatan\n'
    const body = logLines.join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-laper-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="max-w-4xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="import-xlsx">File Excel (.xlsx / .xls)</Label>
          <Input
            id="import-xlsx"
            type="file"
            accept=".xlsx,.xls"
            className="max-w-md cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) parseFile(f)
            }}
          />
          <p className="text-sm text-muted-foreground">
            Kolom wajib: nama, email, instalasi, nomor_wa (header huruf kecil).
          </p>
        </div>

        {rows.length > 0 && (
          <>
            <Card className={cn('overflow-hidden', MOBILE_DASHBOARD_CARD_SHELL)}>
              <CardContent className="max-h-[360px] overflow-auto p-0">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Instalasi</TableHead>
                    <TableHead>WA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow
                      key={i}
                      className={r.email && !isValidEmail(r.email) ? 'bg-destructive/10' : ''}
                    >
                      <TableCell>{r.nama || '—'}</TableCell>
                      <TableCell>{r.email || '—'}</TableCell>
                      <TableCell>{r.instalasi || '—'}</TableCell>
                      <TableCell>{r.nomor_wa || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </CardContent>
            </Card>
            <Button disabled={running} onClick={runImport}>
              Impor semua (baris dengan email valid)
            </Button>
          </>
        )}

        {running && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">Memproses… {progress}%</p>
          </div>
        )}

        {logLines.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm">
              Berhasil: {stats.ok}, gagal: {stats.fail}
            </p>
            <Button variant="outline" size="sm" onClick={downloadReport}>
              Unduh laporan CSV
            </Button>
            <Card className={MOBILE_DASHBOARD_CARD_SHELL}>
              <CardContent className="p-0">
                <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {logLines.slice(-20).join('\n')}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}
