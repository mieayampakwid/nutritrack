-- Add macro/micronutrient columns to food_log_items
ALTER TABLE food_log_items
ADD COLUMN IF NOT EXISTS karbohidrat numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS protein numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lemak numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS serat numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS natrium numeric(8,2) DEFAULT 0;

-- Add aggregate nutrient columns to food_logs
ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS total_karbohidrat numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_protein numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_lemak numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_serat numeric(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_natrium numeric(8,2) DEFAULT 0;
