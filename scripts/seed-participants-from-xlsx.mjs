import process from "node:process";
import xlsxPkg from "xlsx-js-style";
import { createClient } from "@supabase/supabase-js";

const { readFile, utils } = xlsxPkg;

function getArgValue(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/\//g, " / ");
}

function pickColumn(row, headerMap, aliases) {
  for (const alias of aliases) {
    const key = headerMap.get(normalizeHeader(alias));
    if (!key) continue;
    const value = row[key];
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (str === "") continue;
    return value;
  }
  return null;
}

function parseEmail(raw) {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizePhone(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // Keep digits only (remove spaces, dashes, parentheses, etc).
  let digits = s.replace(/\D+/g, "");
  if (!digits) return null;

  // Coerce Indonesian numbers to "62..." (digits only).
  // Examples:
  // - 0812xxxx -> 62812xxxx
  // - +62812xxxx -> 62812xxxx
  // - 812xxxx -> 62812xxxx
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (digits.startsWith("8")) digits = `62${digits}`;

  if (!digits.startsWith("62")) return null;
  if (digits.length < 9) return null;

  return digits;
}

function parseNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const normalized = String(raw).trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function excelDateToIso(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const parsed = utils.format_cell({ t: "n", v: raw }, { dateNF: "yyyy-mm-dd" });
    const asString = String(parsed).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(asString)) return asString;
  }

  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    let yyyy = dmy[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    const iso = `${yyyy}-${mm}-${dd}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }
  return null;
}

function parseJenisKelamin(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;

  const male = new Set(["male", "m", "l", "lk", "laki", "laki-laki", "pria"]);
  const female = new Set([
    "female",
    "f",
    "p",
    "pr",
    "perempuan",
    "wanita",
    "cewe",
    "cewek",
  ]);

  if (male.has(s)) return "male";
  if (female.has(s)) return "female";
  if (s.includes("laki")) return "male";
  if (s.includes("perempuan") || s.includes("wanita")) return "female";
  return null;
}

function printUsageAndExit() {
  // Intentionally plain output (one-time ops script).
  console.log(
    [
      "Usage:",
      "  node scripts/seed-participants-from-xlsx.mjs --file <path.xlsx> --default-password <password> [--dry-run]",
      "",
      "Required env:",
      "  SUPABASE_SERVICE_ROLE_KEY   (never commit this)",
      "",
      "Optional env:",
      "  SUPABASE_URL               (or uses VITE_SUPABASE_URL)",
    ].join("\n"),
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const filePath = getArgValue(args, "--file") ?? args[0];
const defaultPassword = getArgValue(args, "--default-password");
const dryRun = hasFlag(args, "--dry-run");

if (!filePath || !defaultPassword) printUsageAndExit();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("Missing env: SUPABASE_URL (or VITE_SUPABASE_URL)");
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const workbook = readFile(filePath, { cellDates: true });
const sheetName = workbook.SheetNames[0];
if (!sheetName) {
  console.error("No sheets found in workbook.");
  process.exit(1);
}
const sheet = workbook.Sheets[sheetName];

const rows = utils.sheet_to_json(sheet, { defval: "" });
if (!rows.length) {
  console.error("No data rows found in the first sheet.");
  process.exit(1);
}

const firstRow = rows[0];
const headerMap = new Map();
for (const key of Object.keys(firstRow)) {
  headerMap.set(normalizeHeader(key), key);
}

const todayIso = new Date().toISOString().slice(0, 10);

let created = 0;
let skippedDuplicates = 0;
let updatedPhones = 0;
let failed = 0;
const failures = [];

for (let i = 0; i < rows.length; i += 1) {
  const excelRowNumber = i + 2; // header row assumed at row 1
  const row = rows[i];

  const rawEmail = pickColumn(row, headerMap, ["Email", "E-mail"]);
  const email = parseEmail(rawEmail);
  if (!email) {
    failed += 1;
    failures.push({ row: excelRowNumber, email: String(rawEmail ?? ""), reason: "Email missing/invalid" });
    continue;
  }

  const phone = normalizePhone(
    pickColumn(row, headerMap, ["No. HP", "No HP", "No. Hp", "HP", "Phone", "Nomor HP", "Nomor Telepon"]),
  );

  const nama =
    String(pickColumn(row, headerMap, ["Username", "Nama", "Name"]) ?? "")
      .trim() || email.split("@")[0];
  const instalasi = String(pickColumn(row, headerMap, ["Unit / Instalasi", "Unit", "Instalasi"]) ?? "").trim() || null;
  const tglLahir = excelDateToIso(pickColumn(row, headerMap, ["Tanggal Lahir", "Tgl Lahir", "Tanggal lahir"]));
  const jenisKelamin = parseJenisKelamin(
    pickColumn(row, headerMap, ["Jenis kelamin", "Jenis Kelamin", "Gender", "Sex"]),
  );

  const tinggiBadan = parseNumber(pickColumn(row, headerMap, ["TB (cm)", "TB cm", "Tinggi badan", "Tinggi Badan", "Tinggi (cm)"]));
  const lingkarPerut = parseNumber(pickColumn(row, headerMap, ["Lingkar Perut", "Lingkar perut", "Lingkar Pinggang", "Lingkar pinggang"]));

  let existingUserId = null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (error) throw error;
    if (data?.length) {
      existingUserId = data[0]?.id ?? null;
    }
  } catch (e) {
    failed += 1;
    failures.push({ row: excelRowNumber, email, reason: `Duplicate check failed: ${e?.message ?? String(e)}` });
    continue;
  }

  if (dryRun) {
    if (existingUserId) {
      skippedDuplicates += 1;
      if (phone) updatedPhones += 1;
    } else {
      created += 1;
    }
    continue;
  }

  if (existingUserId) {
    skippedDuplicates += 1;

    if (phone) {
      try {
        const { error } = await supabase.auth.admin.updateUserById(existingUserId, {
          phone,
        });
        if (error) throw error;
        updatedPhones += 1;
      } catch (e) {
        failed += 1;
        failures.push({
          row: excelRowNumber,
          email,
          reason: `Update existing phone failed: ${e?.message ?? String(e)}`,
        });
      }
    }

    continue;
  }

  let userId;
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      phone: phone ?? undefined,
      user_metadata: {
        role: "klien",
        nama,
        instalasi,
        tgl_lahir: tglLahir,
        jenis_kelamin: jenisKelamin,
        tinggi_badan: tinggiBadan,
      },
    });
    if (error) {
      const msg = String(error?.message ?? "");
      if (msg.toLowerCase().includes("already registered")) {
        skippedDuplicates += 1;
        continue;
      }
      throw error;
    }
    userId = data?.user?.id;
    if (!userId) throw new Error("createUser succeeded but returned no user id");
  } catch (e) {
    failed += 1;
    failures.push({ row: excelRowNumber, email, reason: `Auth create failed: ${e?.message ?? String(e)}` });
    continue;
  }

  // Seeded accounts should be active immediately (normal self-registration remains inactive by default).
  try {
    const { error } = await supabase.from("profiles").update({ is_active: true }).eq("id", userId);
    if (error) throw error;
  } catch (e) {
    failed += 1;
    failures.push({
      row: excelRowNumber,
      email,
      reason: `Activate profile failed: ${e?.message ?? String(e)}`,
    });
    continue;
  }

  // Store waist circumference as a first measurement row (schema uses lingkar_pinggang).
  if (lingkarPerut !== null || tinggiBadan !== null) {
    try {
      const { error } = await supabase
        .from("body_measurements")
        .upsert(
          {
            user_id: userId,
            tanggal: todayIso,
            tinggi_badan: tinggiBadan,
            lingkar_pinggang: lingkarPerut,
            created_by: userId,
          },
          { onConflict: "user_id,tanggal" },
        );
      if (error) throw error;
    } catch (e) {
      failed += 1;
      failures.push({
        row: excelRowNumber,
        email,
        reason: `Measurement upsert failed: ${e?.message ?? String(e)}`,
      });
      continue;
    }
  }

  created += 1;
}

console.log(
  JSON.stringify(
    {
      file: filePath,
      sheet: sheetName,
      dryRun,
      totalRows: rows.length,
      created,
      skippedDuplicates,
      updatedPhones,
      failed,
      failures,
    },
    null,
    2,
  ),
);
