-- Add BMI and BMR calculated fields to assessments table

ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS bmi numeric(5,2),
ADD COLUMN IF NOT EXISTS bmr numeric(10,2);

-- Add comments for documentation
COMMENT ON COLUMN public.assessments.bmi IS 'Body Mass Index = weight (kg) / height (m)^2';
COMMENT ON COLUMN public.assessments.bmr IS 'Basal Metabolic Rate from Harris-Benedict formula (kkal/hari)';

-- Create index for BMI queries
CREATE INDEX IF NOT EXISTS assessments_bmi_idx ON public.assessments(bmi);
