# LAPER — Prototype Perfection (agent handoff)

Optional reference: `LAPER_Backlog_Sprint_Prototype_Perfection_.md` (original download). This file is the in-repo source of truth.

---

## Checkpoint (update often)

| Field | Value |
| --- | --- |
| **Status** | Backlog #1–#5 implemented; Day 2 revisions pending |
| **Last touched** | Sprint 2 present in repo: #3 measurements + anthropometric change log + `/.../change-log`; #4 evaluation page (`/gizi/evaluation`, `/admin/evaluation`) |
| **Blockers** | none |
| **Resume here** | Implement Day 2 Revisions: Rev 1 navigation cleanup; Rev 2 UI recheck & polish. |

---

## Decisions

- none yet

---

## Sprint 1 — Day 1 (do first)

Order: **#5 → #1 → #2** (small/isolated items first; #2 read-only UI).

### #5 — Food Log — Meal Type Selection

**User story:** As a participant, I want to manually select the meal type when logging food, so that my food entries are categorized accurately regardless of what time I log them.

**Acceptance criteria:**

- Food log entry form includes a dropdown for meal type: Breakfast, Lunch, Dinner, Snack
- Meal type selection is required before saving
- The previous behavior (auto-detect meal type based on entry time) is removed
- No changes to the food input UX — only the meal categorization flow is affected

---

### #1 — AI Input Hardening (Food Log)

**User story:** As a participant, I want the system to warn me if what I entered is not a valid human food, so that my food log remains accurate and calculable.

**Acceptance criteria:**

- Before saving, AI validates whether the input is a recognizable human food
- If input is invalid, AI returns a warning message before the log is saved
- Warning message is friendly and explains why the input cannot be processed
- User can either correct the input or cancel
- Only valid food inputs proceed to calorie estimation and saving

**System prompt (fix if there is a better approach):**

```
You are a food validation assistant for a nutrition monitoring app.
Your job is to determine whether the user's input is a valid human food
that can be nutritionally assessed.

If the input is NOT a valid human food (e.g. non-food objects, abstract
concepts, gibberish, or joke inputs), respond with:
{
  "valid": false,
  "message": "\"[input]\" doesn't seem to be a food item we can assess.
  Please enter a real food or meal so we can calculate its nutritional value."
}

If the input IS a valid human food, respond with:
{
  "valid": true
}

Be strict but fair. Regional or traditional foods are valid.
Respond only in JSON. No explanation outside the JSON.
```

**UI flow:**

1. User types food input → hits submit
2. App calls AI validator before saving
3. **If invalid:** inline warning appears below input field (friendly copy aligned with `message`); input stays open, save is blocked
4. **If valid:** proceeds normally to calorie estimation

---

### #2 — All Clients Page

**User story:** As a nutritionist, I want to see a list of all registered participants so that I can monitor and access their profiles quickly.

**Acceptance criteria:**

- Page displays a list/table of all registered participants
- Each row shows key info (name, latest activity, BMI status)
- Nutritionist can click a participant to view their full profile
- Page is accessible only to nutritionist and admin roles

---

## Sprint 2 — Day 2 (after Sprint 1)

Order: **#3 → #4**. **#4** depends on extended profile/anthropometric data from **#3** and the existing food log.

### #3 — Participant Profile — Extended Fields & Change Log

**User story:** As a nutritionist, I want to record and update each participant's anthropometric data and have all changes logged automatically, so that I can track progress over time.

**Acceptance criteria:**

- Profile includes fields: Weight (BB), Height (TB), Muscle Mass, Body Fat Mass, Waist Circumference, Age, Gender
- BMI is calculated and displayed automatically
- Daily calorie needs calculated automatically using Harris-Benedict method
- Every change to: BB, TB, Muscle Mass, Body Fat Mass, Waist Circumference, BMI result, and Calorie needs — is recorded in a change log with timestamp and previous/new value
- Age and Gender are NOT logged on change
- Change log is viewable on a separate dedicated page

---

### #4 — Evaluation Page (Nutritionist)

**User story:** As a nutritionist, I want to evaluate a participant's progress over a minimum 2-week period, so that I can provide informed dietary recommendations.

**Acceptance criteria:**

- Nutritionist selects a participant and a date range (minimum 2 weeks)
- Page displays: selected participant's info, complete food log within the selected period, latest anthropometric data
- Nutritionist can write and save notes/recommendations in a dedicated input column
- Saved recommendations are timestamped and linked to the evaluation period

---

## Next steps (rolling)

**Sprint Day 1 (DONE per rev050526)**

- [x] #5 — Add required meal-type dropdown; remove time-based auto meal type
- [x] #1 — AI validate-before-save + inline invalid warning + block save until valid
- [x] #2 — All clients table/page; nutritionist + admin only; row → profile

**Sprint Day 2 (IMPLEMENTED in repo)**

- [x] #3 — Extended profile fields, BMI, Harris-Benedict, change log + dedicated log page
- [x] #4 — Evaluation page (≥2 week range, food log + latest anthropometrics, saved recommendations)

**Sprint Day 2 — Revisions (PENDING)**

- [ ] **Rev 1 — Navigation cleanup (Nutritionist & Admin role)**: remove evaluation + client log pages from nav; replace with unified client list page (#2). (Routes still exist; nav still shows Evaluation + Log makan.)
- [ ] **Rev 2 — UI recheck & polish**: fix layout issues, typography consistency, unreadable text, and ensure hierarchy across all views.
