# LAPER — API Specification
*Supabase REST (PostgREST) endpoint reference*

---

## Base URL
```
https://<your-project-ref>.supabase.co/rest/v1
```

## Auth Headers (required on all protected endpoints)
```
Authorization: Bearer <supabase_jwt_token>
apikey: <supabase_anon_key>
```

## Conventions
- All timestamps in ISO 8601: `2026-05-01T08:00:00Z`
- All IDs are UUID v4
- Errors follow PostgREST standard: `{ "code": "...", "message": "...", "details": "..." }`
- Role enforcement via RLS — unauthorized requests return `403`

---

## Endpoints

---

### AUTH

#### Register
Handled by Supabase Auth SDK. After `signUp()`, insert profile row.

```
POST /auth/v1/signup          ← Supabase Auth SDK
POST /rest/v1/profiles        ← Insert profile after signup
```

**Profile INSERT body:**
```json
{
  "id": "<auth.user.id>",
  "full_name": "Budi Santoso",
  "date_of_birth": "1990-04-15",
  "gender": "male",
  "whatsapp_number": "628123456789",
  "role": "user",
  "approval_status": "pending"
}
```

#### Login / Logout
```
POST /auth/v1/token           ← Supabase Auth SDK (signInWithPassword)
POST /auth/v1/logout          ← Supabase Auth SDK (signOut)
```

---

### PROFILES

#### Get own profile
```
GET /rest/v1/profiles?id=eq.<user_id>&select=*
```
**Role:** user (own), ahli_gizi, admin

#### Get any user's full profile (admin / ahli gizi)
```
GET /rest/v1/profiles?id=eq.<target_user_id>&select=*
```
**Role:** ahli_gizi, admin

#### Get all users (admin / ahli gizi)
```
GET /rest/v1/profiles?select=id,full_name,role,approval_status,whatsapp_number,created_at&order=created_at.desc
```
**Role:** ahli_gizi, admin

#### Update user profile (admin / ahli gizi only)
```
PATCH /rest/v1/profiles?id=eq.<target_user_id>
```
**Body (any subset of editable fields):**
```json
{
  "full_name": "Budi Santoso",
  "date_of_birth": "1990-04-15",
  "gender": "male",
  "whatsapp_number": "628123456789"
}
```
**Role:** ahli_gizi, admin  
**Note:** After PATCH, application must INSERT a row into `profile_change_logs` for each changed field.

#### Approve / reject user (admin only)
```
PATCH /rest/v1/profiles?id=eq.<target_user_id>
```
**Body:**
```json
{
  "approval_status": "approved",
  "approved_by": "<admin_user_id>",
  "approved_at": "2026-05-01T09:00:00Z"
}
```
**Role:** admin

#### Delete user (admin only)
```
DELETE /rest/v1/profiles?id=eq.<target_user_id>
```
**Role:** admin  
**Note:** Also call Supabase Auth Admin API to delete auth record: `DELETE /auth/v1/admin/users/<user_id>`

---

### FOOD LOG SESSIONS

#### Create new session (submit food log)
Application must first INSERT the session, then INSERT all food_log items.

**Step 1 — Create session:**
```
POST /rest/v1/food_log_sessions
```
**Body:**
```json
{
  "user_id": "<user_id>",
  "total_calories": 650.00,
  "total_protein": 32.5,
  "total_carbs": 78.0,
  "total_fat": 18.2
}
```
**Returns:** `{ "id": "<session_id>", ... }`

**Step 2 — Insert food items:**
```
POST /rest/v1/food_logs
```
**Body (array):**
```json
[
  {
    "session_id": "<session_id>",
    "user_id": "<user_id>",
    "food_name": "Rawon",
    "meal_category": "makan_siang",
    "calories": 350.00,
    "protein": 18.0,
    "carbs": 30.0,
    "fat": 12.0
  },
  {
    "session_id": "<session_id>",
    "user_id": "<user_id>",
    "food_name": "Nasi Putih",
    "meal_category": "makan_siang",
    "calories": 300.00,
    "protein": 14.5,
    "carbs": 48.0,
    "fat": 6.2
  }
]
```
**Role:** user  
**Note:** No UPDATE or DELETE endpoint exists for `food_logs`. RLS enforces this.

#### Get food logs — today (dashboard)
```
GET /rest/v1/food_logs?user_id=eq.<user_id>&logged_at=gte.<today_start>&logged_at=lte.<today_end>&select=*&order=logged_at.asc
```

#### Get food logs — custom timeframe (progress page / dashboard chart)
```
GET /rest/v1/food_logs?user_id=eq.<user_id>&logged_at=gte.<start_date>&logged_at=lte.<end_date>&select=*&order=logged_at.asc
```

#### Get session with items (receipt view)
```
GET /rest/v1/food_log_sessions?id=eq.<session_id>&select=*,food_logs(*)
```

#### Get daily calorie totals for chart
```
GET /rest/v1/food_log_sessions?user_id=eq.<user_id>&submitted_at=gte.<start_date>&submitted_at=lte.<end_date>&select=submitted_at,total_calories,total_protein,total_carbs,total_fat&order=submitted_at.asc
```

#### Toggle favorite
```
PATCH /rest/v1/food_logs?id=eq.<food_log_id>&user_id=eq.<user_id>
```
**Body:**
```json
{ "is_favorite": true }
```
**Role:** user (own entries only)

#### Get favorites
```
GET /rest/v1/food_logs?user_id=eq.<user_id>&is_favorite=eq.true&select=food_name,meal_category,calories,protein,carbs,fat&order=food_name.asc
```

#### Get trending foods
```
GET /rest/v1/food_logs?logged_at=gte.<start_date>&logged_at=lte.<end_date>&select=food_name&order=food_name.asc
```
**Note:** Aggregate `COUNT GROUP BY food_name` must be done via Supabase RPC (database function) or client-side aggregation. Recommended: create a Postgres function `get_trending_foods(start_date, end_date, limit)`.

---

### EXERCISE LOGS

#### Create exercise entry
```
POST /rest/v1/exercise_logs
```
**Body:**
```json
{
  "user_id": "<user_id>",
  "exercise_type": "Jogging",
  "duration_minutes": 30
}
```
**Role:** user

#### Get exercise logs for a user
```
GET /rest/v1/exercise_logs?user_id=eq.<user_id>&select=*&order=logged_at.desc
```
**Role:** user (own), ahli_gizi, admin

---

### ASSESSMENT SESSIONS

#### Create assessment session
```
POST /rest/v1/assessment_sessions
```
**Body:**
```json
{
  "user_id": "<target_user_id>",
  "assessed_by": "<ahli_gizi_user_id>",
  "weight_kg": 68.5,
  "height_cm": 165.0,
  "bmi": 25.16,
  "waist_circumference_cm": 82.0,
  "muscle_mass_kg": 28.3,
  "fat_mass_kg": 18.1,
  "activity_level": "lightly_active",
  "daily_calorie_needs": 2187.50
}
```
**Role:** ahli_gizi  
**Note:** `bmi` and `daily_calorie_needs` are calculated client-side before INSERT. No UPDATE or DELETE.

#### Get all assessment sessions for a participant
```
GET /rest/v1/assessment_sessions?user_id=eq.<user_id>&select=*&order=assessed_at.asc
```
**Role:** ahli_gizi, admin

#### Get latest assessment session (for calorie limit line on dashboard)
```
GET /rest/v1/assessment_sessions?user_id=eq.<user_id>&select=daily_calorie_needs,assessed_at&order=assessed_at.desc&limit=1
```
**Role:** user, ahli_gizi, admin

---

### EVALUATION SESSIONS

#### Check eligibility (before showing evaluation form)
Application queries last evaluation date before allowing new session:
```
GET /rest/v1/evaluation_sessions?user_id=eq.<user_id>&select=evaluated_at&order=evaluated_at.desc&limit=1
```
If `evaluated_at` is less than 14 days ago → block and show message.

#### Create evaluation session
```
POST /rest/v1/evaluation_sessions
```
**Body:**
```json
{
  "assessment_session_id": "<assessment_session_id>",
  "user_id": "<target_user_id>",
  "evaluated_by": "<ahli_gizi_user_id>",
  "evaluation_notes": "Berat badan turun 1.5kg dari sesi sebelumnya. Konsumsi protein masih kurang. Disarankan menambah asupan protein hewani.",
  "pdf_generated": false
}
```
**Role:** ahli_gizi  
**Note:** No UPDATE or DELETE.

#### Get all evaluation sessions for a participant (ahli gizi view)
```
GET /rest/v1/evaluation_sessions?user_id=eq.<user_id>&select=*,assessment_sessions(*)&order=evaluated_at.asc
```
**Role:** ahli_gizi, admin

#### Get evaluation sessions for own account (user view)
```
GET /rest/v1/evaluation_sessions?user_id=eq.<auth_user_id>&select=id,evaluated_at,evaluation_notes,assessment_sessions(weight_kg,height_cm,bmi,daily_calorie_needs,activity_level)&order=evaluated_at.desc
```
**Role:** user (own only)

#### Get single evaluation session (detail / report view)
```
GET /rest/v1/evaluation_sessions?id=eq.<evaluation_id>&select=*,assessment_sessions(*),profiles!evaluated_by(full_name)
```
**Role:** user (own), ahli_gizi, admin

#### Mark PDF as generated
```
PATCH /rest/v1/evaluation_sessions?id=eq.<evaluation_id>
```
**Body:**
```json
{ "pdf_generated": true }
```
**Role:** ahli_gizi

---

### PROFILE CHANGE LOGS

#### Insert change log entry (called after every profile/assessment edit)
```
POST /rest/v1/profile_change_logs
```
**Body:**
```json
{
  "target_user_id": "<user_id>",
  "changed_by": "<admin_or_ahligizi_id>",
  "table_name": "profiles",
  "field_name": "whatsapp_number",
  "old_value": "628111111111",
  "new_value": "628222222222"
}
```
**Role:** ahli_gizi, admin  
**Note:** INSERT only. No UPDATE or DELETE for any role.

#### Get change log for a user
```
GET /rest/v1/profile_change_logs?target_user_id=eq.<user_id>&select=*,profiles!changed_by(full_name)&order=changed_at.desc
```
**Role:** ahli_gizi, admin

---

### NOTIFICATIONS

#### Get unread notifications for current user
```
GET /rest/v1/notifications?user_id=eq.<user_id>&is_read=eq.false&select=*&order=created_at.desc
```

#### Mark notification as read
```
PATCH /rest/v1/notifications?id=eq.<notification_id>&user_id=eq.<user_id>
```
**Body:**
```json
{ "is_read": true }
```

#### Create notification (server-side / triggered by application logic)
```
POST /rest/v1/notifications
```
**Body:**
```json
{
  "user_id": "<recipient_user_id>",
  "type": "evaluation_overdue",
  "message": "Peserta Budi Santoso belum dievaluasi dalam 14 hari. Segera lakukan evaluasi."
}
```
**Note:** Notification creation is triggered by application logic, not direct user action. Trigger points:
- Meal reminder: checked on food log page load, per meal time window
- Evaluation overdue: checked on ahli gizi dashboard load and participant list load

---

### AD BANNERS

#### Get active banners (ordered for carousel)
```
GET /rest/v1/ad_banners?is_active=eq.true&select=id,image_url,display_order&order=display_order.asc
```
**Role:** user, ahli_gizi (not shown to admin)

---

### CSV EXPORT (Admin)

Supabase REST supports direct table export. For filtered CSV export:
```
GET /rest/v1/food_logs?user_id=eq.<user_id>&logged_at=gte.<start>&logged_at=lte.<end>&select=*
Headers: Accept: text/csv
```
For full user data export with joins, use a Postgres function via RPC:
```
POST /rest/v1/rpc/export_user_data_csv
```
**Body:**
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-05-05"
}
```
**Role:** admin

---

## WhatsApp Share — Client-Side Implementation

No API call required. After evaluation submit, frontend constructs a `wa.me` deep link:

```javascript
const buildWhatsAppMessage = (evaluation, assessment, participant) => {
  const message = `
*HASIL EVALUASI GIZI*
*Program: Challenge Glow Up 100 Hari*

Peserta: ${participant.full_name}
Tanggal Evaluasi: ${formatDate(evaluation.evaluated_at)}

*DATA ANTROPOMETRI*
Berat Badan: ${assessment.weight_kg} kg
Tinggi Badan: ${assessment.height_cm} cm
BMI: ${assessment.bmi}
Lingkar Perut: ${assessment.waist_circumference_cm} cm
Massa Otot: ${assessment.muscle_mass_kg} kg
Massa Lemak: ${assessment.fat_mass_kg} kg

*KEBUTUHAN KALORI HARIAN*
${assessment.daily_calorie_needs} kkal/hari
(Tingkat Aktivitas: ${assessment.activity_level})

*CATATAN EVALUASI*
${evaluation.evaluation_notes}

_Dikirim melalui aplikasi LAPER_
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const phone = participant.whatsapp_number;
  return `https://wa.me/${phone}?text=${encodedMessage}`;
};
```

PDF is generated client-side using jsPDF from the same evaluation data before or after share.

---

## Error Reference

| HTTP Code | Meaning | Common Cause |
|-----------|---------|-------------|
| 400 | Bad Request | Missing required field, type mismatch |
| 401 | Unauthorized | Missing or expired JWT |
| 403 | Forbidden | RLS policy blocked the operation |
| 404 | Not Found | Row does not exist or RLS hides it |
| 409 | Conflict | Duplicate unique constraint violation |
| 422 | Unprocessable | CHECK constraint violation (e.g. invalid role value) |
| 500 | Server Error | Database error, contact Supabase logs |
