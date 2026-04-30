# LAPER — Screen Inventory

*Page-by-page breakdown of all screens, accessible roles, and mapped user stories*

---

## Screen Index


| #    | Screen                              | Route                         | Accessible By                |
| ---- | ----------------------------------- | ----------------------------- | ---------------------------- |
| S-01 | Register                            | `/register`                   | Public                       |
| S-02 | Login                               | `/login`                      | Public                       |
| S-03 | Pending Approval                    | `/pending`                    | User (unapproved)            |
| S-04 | Dashboard — User                    | `/dashboard`                  | User                         |
| S-05 | Dashboard — Ahli Gizi               | `/dashboard`                  | Ahli Gizi                    |
| S-06 | Dashboard — Admin                   | `/dashboard`                  | Admin                        |
| S-07 | Food Log Entry                      | `/food-log/new`               | User                         |
| S-08 | Food Log Receipt                    | `/food-log/receipt`           | User                         |
| S-09 | Progress Page                       | `/progress`                   | User                         |
| S-10 | Exercise Log                        | `/exercise-log`               | User                         |
| S-11 | User Profile View                   | `/profile/:id`                | User (own), Ahli Gizi, Admin |
| S-12 | Assessment Form                     | `/assessment/:userId`         | Ahli Gizi                    |
| S-13 | Evaluation Form                     | `/evaluation/:userId`         | Ahli Gizi                    |
| S-14 | Evaluation History — Ahli Gizi View | `/evaluation/:userId/history` | Ahli Gizi                    |
| S-15 | Evaluation History — User View      | `/my-evaluations`             | User                         |
| S-16 | Participant List                    | `/participants`               | Ahli Gizi                    |
| S-17 | Admin — User Management             | `/admin/users`                | Admin                        |
| S-18 | Admin — Export CSV                  | `/admin/export`               | Admin                        |


---

## Screen Details

---

### S-01 — Register

**Route:** `/register`  
**Accessible by:** Public (unauthenticated)


| US    | Description                                                                |
| ----- | -------------------------------------------------------------------------- |
| US-01 | Form fields: email, password, name, date of birth, gender, WhatsApp number |
| US-22 | Role selection at registration: User or Ahli Gizi                          |


**Notes:** After submitting, user is redirected to S-03 (Pending Approval). Admin must approve before access is granted.

---

### S-02 — Login

**Route:** `/login`  
**Accessible by:** Public (unauthenticated)


| US    | Description                                                                |
| ----- | -------------------------------------------------------------------------- |
| US-02 | Email + password login; redirects to role-appropriate dashboard on success |


---

### S-03 — Pending Approval

**Route:** `/pending`  
**Accessible by:** User (registered but not yet approved)


| US    | Description                                                                     |
| ----- | ------------------------------------------------------------------------------- |
| US-03 | Informational screen; user waits for admin approval before accessing the system |


---

### S-04 — Dashboard — User

**Route:** `/dashboard`  
**Accessible by:** User

**Layout (top to bottom):**


| Position | Element                                                                                                    | US           |
| -------- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| 1        | Ad carousel banner — 600x300px, 3 PNG images, auto-rotating                                                | US-46        |
| 2        | Today's food log — list of entries logged today                                                            | US-10        |
| 3        | Today's total calories + macros summary                                                                    | US-10        |
| 4        | Remaining calories indicator (based on latest Harris-Benedict result)                                      | US-12        |
| 5        | Weekly calorie intake chart with red dotted calorie limit line; timeframe selector (default 7 days)        | US-10, US-11 |
| 6        | Trending food section — most frequently logged foods across all users; timeframe selector (default: today) | US-44        |


---

### S-05 — Dashboard — Ahli Gizi

**Route:** `/dashboard`  
**Accessible by:** Ahli Gizi

**Layout (top to bottom):**


| Position | Element                                                                                                    | US    |
| -------- | ---------------------------------------------------------------------------------------------------------- | ----- |
| 1        | Ad carousel banner — 600x300px, 3 PNG images, auto-rotating                                                | US-46 |
| 2        | Pending evaluation notifications — users not evaluated within 2 weeks                                      | US-33 |
| 3        | Trending food section — most frequently logged foods across all users; timeframe selector (default: today) | US-44 |


---

### S-06 — Dashboard — Admin

**Route:** `/dashboard`  
**Accessible by:** Admin

**Layout (top to bottom):**


| Position | Element                                                                                                    | US           |
| -------- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| 1        | Registered user list summary + pending approval count                                                      | US-03, US-16 |
| 2        | Trending food section — most frequently logged foods across all users; timeframe selector (default: today) | US-44        |


**Notes:** No ad banner on admin dashboard.

---

### S-07 — Food Log Entry

**Route:** `/food-log/new`  
**Accessible by:** User


| US    | Description                                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| US-04 | Text input in Indonesian; AI returns calorie + macro data per item                                                                |
| US-05 | User confirms each entry before it is added to the session list                                                                   |
| US-08 | If input is vague, system prompts user to specify before proceeding                                                               |
| US-13 | Meal category selector per item: Sarapan / Makan Siang / Makan Malam / Snack                                                      |
| US-42 | Dynamic multi-item entry: user can add and remove items before submitting the full session; each item stored as a separate record |


**Notes:** No edit or delete of entries after submission. Entries are immutable once saved.

---

### S-08 — Food Log Receipt

**Route:** `/food-log/receipt` (shown after submit on S-07)  
**Accessible by:** User


| US    | Description                                                                     |
| ----- | ------------------------------------------------------------------------------- |
| US-43 | Receipt-style display: breakdown of calorie + macro per item, and session total |


**Notes:** Read-only. No actions on this screen other than navigation away.

---

### S-09 — Progress Page

**Route:** `/progress`  
**Accessible by:** User


| US    | Description                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------- |
| US-45 | Complete food log history with timeframe selector                                                  |
| US-32 | User views their own evaluation history from the nutritionist                                      |
| US-36 | Independent chart section: BB, TB, massa lemak, massa otot, lingkar perut, calorie needs over time |


---

### S-10 — Exercise Log

**Route:** `/exercise-log`  
**Accessible by:** User


| US    | Description                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------- |
| US-40 | Log physical activity: type of exercise + duration; entries appear in user profile and during nutritionist evaluation |


---

### S-11 — User Profile View

**Route:** `/profile/:id`  
**Accessible by:** User (own profile, read-only), Ahli Gizi (full access + edit), Admin (full access + edit)


| US    | Description                                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-38 | User cannot edit any profile data; fields are display-only for user role                                                                            |
| US-37 | Admin and ahli gizi see full profile: personal data, meal history, assessment history, evaluation history, exercise log; can edit/update all fields |
| US-34 | Ahli gizi / admin can add or update: lingkar perut, massa otot, massa lemak                                                                         |
| US-35 | All edits by admin/ahli gizi are logged: who changed, timestamp, old value → new value                                                              |
| US-36 | Independent chart section: BB, TB, massa lemak, massa otot, lingkar perut, calorie needs over time                                                  |
| US-28 | Ahli gizi views BB/TB/BMI change history per participant                                                                                            |


---

### S-12 — Assessment Form

**Route:** `/assessment/:userId`  
**Accessible by:** Ahli Gizi


| US    | Description                                                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| US-23 | Select participant from registered user list                                                                                                 |
| US-24 | Input BB and TB                                                                                                                              |
| US-25 | BMI calculated automatically after BB/TB input                                                                                               |
| US-26 | Mandatory reassessment every evaluation session: update BB, TB, activity level → system recalculates daily calorie needs via Harris-Benedict |
| US-29 | Activity level selector: sedentary / lightly active / moderately active / very active                                                        |
| US-34 | Input lingkar perut, massa otot, massa lemak                                                                                                 |


**Notes:** This screen is entered at the start of every evaluation session. Reassessment is mandatory before evaluation notes can be submitted.

---

### S-13 — Evaluation Form

**Route:** `/evaluation/:userId`  
**Accessible by:** Ahli Gizi


| US    | Description                                                                                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-30 | Text field for evaluation notes per session                                                                                                                                                         |
| US-33 | System blocks new session creation if fewer than 2 weeks have passed since last session                                                                                                             |
| US-39 | After submit: "Share ke WhatsApp" button generates pre-composed wa.me message with participant's updated condition summary + recommendations, addressed to participant's registered WhatsApp number |


---

### S-14 — Evaluation History — Ahli Gizi View

**Route:** `/evaluation/:userId/history`  
**Accessible by:** Ahli Gizi


| US    | Description                                                                     |
| ----- | ------------------------------------------------------------------------------- |
| US-31 | Full evaluation session history per participant: date, reassessment data, notes |


---

### S-15 — Evaluation History — User View

**Route:** `/my-evaluations`  
**Accessible by:** User


| US    | Description                                                                                |
| ----- | ------------------------------------------------------------------------------------------ |
| US-32 | User views their own evaluation history: date, nutritionist notes, calorie recommendations |


---

### S-16 — Participant List

**Route:** `/participants`  
**Accessible by:** Ahli Gizi


| US    | Description                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------- |
| US-23 | List of all registered users; entry point to assessment and evaluation screens                           |
| US-33 | Visual indicator on each participant showing days since last evaluation; highlights overdue participants |


---

### S-17 — Admin — User Management

**Route:** `/admin/users`  
**Accessible by:** Admin


| US    | Description                                       |
| ----- | ------------------------------------------------- |
| US-03 | Approve or reject pending user registrations      |
| US-16 | List of all registered users with role and status |
| US-17 | Delete user account                               |


---

### S-18 — Admin — Export CSV

**Route:** `/admin/export`  
**Accessible by:** Admin


| US    | Description                     |
| ----- | ------------------------------- |
| US-14 | Export all user data as CSV     |
| US-15 | Date range filter before export |


---

## Notification Triggers (In-App)


| Trigger                                          | Recipient        | US    |
| ------------------------------------------------ | ---------------- | ----- |
| User has not logged a meal for a given meal time | User             | US-13 |
| User has not been evaluated within 2 weeks       | User + Ahli Gizi | US-33 |


---

## Role Access Summary


| Screen                         | User          | Ahli Gizi | Admin    |
| ------------------------------ | ------------- | --------- | -------- |
| S-01 Register                  | ✓             | ✓         | ✓        |
| S-02 Login                     | ✓             | ✓         | ✓        |
| S-03 Pending Approval          | ✓             | ✓         | —        |
| S-04 Dashboard User            | ✓             | —         | —        |
| S-05 Dashboard Ahli Gizi       | —             | ✓         | —        |
| S-06 Dashboard Admin           | —             | —         | ✓        |
| S-07 Food Log Entry            | ✓             | —         | —        |
| S-08 Food Log Receipt          | ✓             | —         | —        |
| S-09 Progress Page             | ✓             | —         | —        |
| S-10 Exercise Log              | ✓             | —         | —        |
| S-11 User Profile              | ✓ (read-only) | ✓ (edit)  | ✓ (edit) |
| S-12 Assessment Form           | —             | ✓         | —        |
| S-13 Evaluation Form           | —             | ✓         | —        |
| S-14 Evaluation History (AG)   | —             | ✓         | —        |
| S-15 Evaluation History (User) | ✓             | —         | —        |
| S-16 Participant List          | —             | ✓         | —        |
| S-17 Admin User Management     | —             | —         | ✓        |
| S-18 Admin Export CSV          | —             | —         | ✓        |


