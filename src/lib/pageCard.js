/**
 * Radius for meal-log day tiles + klien dashboard log shell (see FoodLogTable, KlienDashboard).
 */
export const MEAL_LOG_DAY_CARD_RADIUS_CLASS = 'rounded-3xl'

/** Klien dashboard “Log makanan” outer card — full breakpoints. */
export const KLIEN_DASHBOARD_LOG_CARD_SHELL = `${MEAL_LOG_DAY_CARD_RADIUS_CLASS} overflow-hidden border-border/70 bg-white text-neutral-900 shadow-md`

/**
 * Mobile: same surface as the klien dashboard log card.
 * On md+, default `Card` chrome applies unless you add e.g. `md:rounded-xl`.
 */
export const MOBILE_DASHBOARD_CARD_SHELL =
  'max-md:rounded-3xl max-md:border-border/70 max-md:bg-white max-md:text-neutral-900 max-md:shadow-md'
