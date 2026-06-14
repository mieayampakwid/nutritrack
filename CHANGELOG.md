# Changelog — NutriTrack Dashboard & Food Diary Refinements

## Dashboard (Klien)

### Calorie Summary Card
- New donut chart with remaining calories (SVG-based, smooth CSS animation)
- Target / Makanan / Olahraga rows with Phosphor fill icons (FlagBanner, Hamburger, PersonSimpleRun)
- Over-budget: teal fills 100%, coral-red arc shows excess on top
- Gray diagonal hatch pattern on target ring when over budget
- Footer with current streak (Fire icon) + 7-day weekly presence circles (S S R K J S M)
- Honest streak — only counts entries logged same-day, survives until day break
- Clickable streak callout explaining rules + "Lanjut streak?" link to food diary

### Ad Carousel
- Dismissible ad section — close button saves state to sessionStorage per user

### Layout
- Action cards (Tambah diary makanan / Lihat progres) removed — redundant with nav
- Date picker + food/activity logs moved above nutrition summary and chart
- Calorie chart reduced from 30 to 14 days
- Standardized all card radii to `rounded-2xl`

### Hero
- Logo replaced with `laper-app.png`
- Hero background now scrolls with page (was fixed)

---

## Food Diary Page

### Pre-Save (Analysis Confirmation)
- Compact card layout — removed verbose receipt (Struk Estimasi header, date, time)
- Meal-time-based card colors (emerald/orange/blue/rose)
- Inline macros: P · K · L · S · Na per item
- Per-item delete button on each analyzed row (Trash2 icon with separator line)
- Multi-row "Tambah Makanan" inline form — add multiple meals, one-click "Analisa"
- Collapsible header "Ada yang lupa ditambahkan?" with chevron toggle

### Post-Save (After Submit)
- No save card displayed — brief checkmark animation then auto-reset to form
- No toast notification for save success

### Main Entry Form
- Rearranged to 2-line stacked layout (food name full-width, qty + unit second row)
- Meal-colored soft header on each food row
- Removed left accent bar
- Unit dropdown font size matches other inputs (text-base md:text-sm)

### Bug Fixes
- `crypto.randomUUID()` → `safeUUID()` fallback for iOS Safari non-secure context
- Tab state preserved when switching Makanan/Aktivitas via `forceMount`
- Framer-motion `layout` animation removed (was causing rectangle artifact in food log dialog)
- `ring-1` removed from meal cards in detail dialog (uneven border)
- Close button enlarged + z-index fixed in food log detail dialog

---

## Technical

### Dependencies
- Added `@phosphor-icons/react` (filled icons for calorie card)
- Removed `lottie-react` (reverted to Phosphor Fire icon)

### Styling
- `rounded-2xl` standardized across all Card components and page cards
- Food entry cards: 100% opacity, shadow removed, `ring-1` kept for border
- Unified placeholder/text sizes in food entry inputs
- Clock button: reduced height, meal-colored accent, min-width for filled state

### Macros in Food Log Table
- Single-letter K/P/L → Karbo/Protein/Lemak
