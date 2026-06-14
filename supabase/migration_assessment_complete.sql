-- Add body measurement fields and catatan_asesmen to assessments table
ALTER TABLE public.assessments
ADD COLUMN tanggal date not null default current_date,
ADD COLUMN berat_badan numeric(5,2),
ADD COLUMN tinggi_badan numeric(5,2),
ADD COLUMN massa_otot numeric(5,2),
ADD COLUMN massa_lemak numeric(5,2),
ADD COLUMN lingkar_pinggang numeric(6,2),
ADD COLUMN jenis_kelamin varchar(10),
ADD COLUMN umur integer,
ADD COLUMN catatan_asesmen TEXT;

-- Create index for querying by user and date
CREATE INDEX assessments_user_date_idx
ON public.assessments(user_id, tanggal DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.assessments.tanggal IS 'Date of assessment';
COMMENT ON COLUMN public.assessments.berat_badan IS 'Weight in kg';
COMMENT ON COLUMN public.assessments.tinggi_badan IS 'Height in cm';
COMMENT ON COLUMN public.assessments.massa_otot IS 'Muscle mass in kg';
COMMENT ON COLUMN public.assessments.massa_lemak IS 'Fat mass percentage';
COMMENT ON COLUMN public.assessments.lingkar_pinggang IS 'Waist circumference in cm';
COMMENT ON COLUMN public.assessments.jenis_kelamin IS 'Gender: male or female';
COMMENT ON COLUMN public.assessments.umur IS 'Age in years';
COMMENT ON COLUMN public.assessments.catatan_asesmen IS 'Clinical evaluation notes from dietitian';
