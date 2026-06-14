


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_get_user_phone"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  if not public.jwt_is_staff() then
    raise exception 'forbidden';
  end if;

  return (select u.phone from auth.users u where u.id = p_user_id);
end;
$$;


ALTER FUNCTION "public"."admin_get_user_phone"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_profiles"() RETURNS TABLE("id" "uuid", "nama" "text", "email" "text", "instalasi" "text", "role" "text", "is_active" boolean, "created_at" timestamp with time zone, "berat_badan" numeric, "tinggi_badan" numeric, "tgl_lahir" "date", "jenis_kelamin" "text", "phone" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    p.id,
    p.nama,
    p.email,
    p.instalasi,
    p.role,
    p.is_active,
    p.created_at,
    p.berat_badan,
    p.tinggi_badan,
    p.tgl_lahir,
    p.jenis_kelamin,
    u.phone
  from public.profiles p
  left join auth.users u on u.id = p.id
  where public.jwt_is_staff()
  order by p.created_at desc;
$$;


ALTER FUNCTION "public"."admin_list_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."append_antrop_change"("p_user_id" "uuid", "p_field" "text", "p_old" "text", "p_new" "text", "p_changed_by" "uuid", "p_source" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if p_old is not distinct from p_new then
    return;
  end if;
  insert into public.anthropometric_change_log (user_id, field, old_value, new_value, changed_by, source)
  values (p_user_id, p_field, p_old, p_new, p_changed_by, p_source);
end;
$$;


ALTER FUNCTION "public"."append_antrop_change"("p_user_id" "uuid", "p_field" "text", "p_old" "text", "p_new" "text", "p_changed_by" "uuid", "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bmi_from_bb_tb"("bb" numeric, "tb" numeric) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when bb is null or tb is null or bb <= 0 or tb <= 0 then null
    else round((bb / power(tb / 100.0, 2))::numeric, 2)
  end;
$$;


ALTER FUNCTION "public"."bmi_from_bb_tb"("bb" numeric, "tb" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."food_log_owned_by_me"("p_food_log_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.food_logs fl
    where fl.id = p_food_log_id
      and fl.user_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."food_log_owned_by_me"("p_food_log_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  r text;
  v_is_active boolean;
  v_berat numeric;
  v_tinggi numeric;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'klien');
  if r not in ('admin', 'ahli_gizi', 'klien') then
    r := 'klien';
  end if;

  v_is_active := false;

  v_berat := nullif(trim(coalesce(new.raw_user_meta_data->>'berat_badan', '')), '')::numeric;
  v_tinggi := nullif(trim(coalesce(new.raw_user_meta_data->>'tinggi_badan', '')), '')::numeric;

  insert into public.profiles (
    id,
    nama,
    email,
    instalasi,
    role,
    is_active,
    tgl_lahir,
    jenis_kelamin,
    berat_badan,
    tinggi_badan
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data->>'instalasi'), ''),
    r,
    v_is_active,
    case
      when trim(coalesce(new.raw_user_meta_data->>'tgl_lahir', '')) ~ '^\d{4}-\d{2}-\d{2}$'
        then trim(new.raw_user_meta_data->>'tgl_lahir')::date
      else null
    end,
    nullif(trim(coalesce(new.raw_user_meta_data->>'jenis_kelamin', '')), ''),
    v_berat,
    v_tinggi
  )
  on conflict (id) do update set
    nama = excluded.nama,
    email = excluded.email,
    instalasi = coalesce(excluded.instalasi, public.profiles.instalasi),
    role = excluded.role,
    is_active = coalesce(excluded.is_active, public.profiles.is_active),
    tgl_lahir = coalesce(excluded.tgl_lahir, public.profiles.tgl_lahir),
    jenis_kelamin = coalesce(excluded.jenis_kelamin, public.profiles.jenis_kelamin),
    berat_badan = coalesce(excluded.berat_badan, public.profiles.berat_badan),
    tinggi_badan = coalesce(excluded.tinggi_badan, public.profiles.tinggi_badan);

  -- Insert first anthropometric measurement on registration
  if (v_berat is not null or v_tinggi is not null) then
    insert into public.body_measurements (user_id, tanggal, berat_badan, tinggi_badan, created_by)
    values (new.id, current_date, v_berat, v_tinggi, new.id)
    on conflict (user_id, tanggal) do nothing;
  end if;

  return new;
end;
$_$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jwt_is_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select p.role in ('admin', 'ahli_gizi') from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;


ALTER FUNCTION "public"."jwt_is_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_assessments_change_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.append_antrop_change(
      new.user_id,
      'energi_total',
      null::text,
      new.energi_total::text,
      coalesce(new.created_by, (select auth.uid())),
      'assessments'
    );
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_assessments_change_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_body_measurements_change_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_by uuid;
  o record;
  n record;
begin
  v_by := coalesce(new.created_by, (select auth.uid()));

  if tg_op = 'INSERT' then
    perform public.append_antrop_change(new.user_id, 'berat_badan', null::text, new.berat_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'tinggi_badan', null::text, new.tinggi_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'massa_otot', null::text, new.massa_otot::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'massa_lemak', null::text, new.massa_lemak::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'lingkar_pinggang', null::text, new.lingkar_pinggang::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'bmi', null::text, new.bmi::text, v_by, 'body_measurements');
  else
    o := old;
    n := new;
    perform public.append_antrop_change(n.user_id, 'berat_badan', o.berat_badan::text, n.berat_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'tinggi_badan', o.tinggi_badan::text, n.tinggi_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'massa_otot', o.massa_otot::text, n.massa_otot::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'massa_lemak', o.massa_lemak::text, n.massa_lemak::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'lingkar_pinggang', o.lingkar_pinggang::text, n.lingkar_pinggang::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'bmi', o.bmi::text, n.bmi::text, v_by, 'body_measurements');
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."trg_body_measurements_change_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_profiles_antrop_change_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_by uuid;
  o_bmi numeric;
  n_bmi numeric;
begin
  if new.role is distinct from 'klien' then
    return new;
  end if;

  v_by := (select auth.uid());

  if old.berat_badan is distinct from new.berat_badan then
    perform public.append_antrop_change(new.id, 'berat_badan', old.berat_badan::text, new.berat_badan::text, v_by, 'profiles');
  end if;

  if old.tinggi_badan is distinct from new.tinggi_badan then
    perform public.append_antrop_change(new.id, 'tinggi_badan', old.tinggi_badan::text, new.tinggi_badan::text, v_by, 'profiles');
  end if;

  if old.berat_badan is distinct from new.berat_badan or old.tinggi_badan is distinct from new.tinggi_badan then
    o_bmi := public.bmi_from_bb_tb(old.berat_badan, old.tinggi_badan);
    n_bmi := public.bmi_from_bb_tb(new.berat_badan, new.tinggi_badan);
    perform public.append_antrop_change(new.id, 'bmi', o_bmi::text, n_bmi::text, v_by, 'profiles');
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_profiles_antrop_change_log"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."anthropometric_change_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "field" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "source" "text" NOT NULL,
    CONSTRAINT "anthropometric_change_log_field_chk" CHECK (("field" = ANY (ARRAY['berat_badan'::"text", 'tinggi_badan'::"text", 'massa_otot'::"text", 'massa_lemak'::"text", 'lingkar_pinggang'::"text", 'bmi'::"text", 'energi_total'::"text"]))),
    CONSTRAINT "anthropometric_change_log_source_chk" CHECK (("source" = ANY (ARRAY['body_measurements'::"text", 'assessments'::"text", 'profiles'::"text"])))
);


ALTER TABLE "public"."anthropometric_change_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "faktor_aktivitas" numeric(6,3) NOT NULL,
    "faktor_stres" numeric(6,3) NOT NULL,
    "energi_total" numeric(10,2) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."body_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tanggal" "date" NOT NULL,
    "berat_badan" numeric(5,2),
    "tinggi_badan" numeric(5,2),
    "massa_otot" numeric(5,2),
    "massa_lemak" numeric(5,2),
    "bmi" numeric(5,2),
    "catatan" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lingkar_pinggang" numeric(6,2)
);


ALTER TABLE "public"."body_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tanggal" "date" NOT NULL,
    "jenis_olahraga" "text" NOT NULL,
    "durasi" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kalori_estimasi" numeric(8,2) DEFAULT 0
);


ALTER TABLE "public"."exercise_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_log_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "food_log_id" "uuid",
    "nama_makanan" "text" NOT NULL,
    "jumlah" numeric(6,2) NOT NULL,
    "unit_id" "uuid",
    "unit_nama" "text" NOT NULL,
    "kalori_estimasi" numeric(8,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_log_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tanggal" "date" NOT NULL,
    "waktu_makan" "text" NOT NULL,
    "total_kalori" numeric(8,2) DEFAULT 0,
    "status" "text" DEFAULT 'saved'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "food_logs_status_check" CHECK (("status" = 'saved'::"text")),
    CONSTRAINT "food_logs_waktu_makan_check" CHECK (("waktu_makan" = ANY (ARRAY['pagi'::"text", 'siang'::"text", 'malam'::"text", 'snack'::"text"])))
);


ALTER TABLE "public"."food_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."food_name_suggestions" WITH ("security_invoker"='true') AS
 SELECT "nama_makanan",
    "count"(*) AS "frekuensi"
   FROM "public"."food_log_items"
  GROUP BY "nama_makanan"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."food_name_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nama" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nama" "text" NOT NULL,
    "email" "text" NOT NULL,
    "instalasi" "text",
    "role" "text" DEFAULT 'klien'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "berat_badan" numeric(6,2),
    "tinggi_badan" numeric(6,2),
    "tgl_lahir" "date",
    "jenis_kelamin" "text",
    CONSTRAINT "profiles_jenis_kelamin_check" CHECK ((("jenis_kelamin" IS NULL) OR ("jenis_kelamin" = ANY (ARRAY['male'::"text", 'female'::"text"])))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'ahli_gizi'::"text", 'klien'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date_from" "date" NOT NULL,
    "date_to" "date" NOT NULL,
    "exercise_freq" "text",
    "sleep_enough" boolean,
    "veg_times_per_day" numeric(6,2),
    "usage_notes" "text",
    "bmi" numeric(5,2),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recommendations" "text"
);


ALTER TABLE "public"."user_evaluations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anthropometric_change_log"
    ADD CONSTRAINT "anthropometric_change_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_user_id_tanggal_key" UNIQUE ("user_id", "tanggal");



ALTER TABLE ONLY "public"."exercise_logs"
    ADD CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_log_items"
    ADD CONSTRAINT "food_log_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_logs"
    ADD CONSTRAINT "food_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_units"
    ADD CONSTRAINT "food_units_nama_key" UNIQUE ("nama");



ALTER TABLE ONLY "public"."food_units"
    ADD CONSTRAINT "food_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_evaluations"
    ADD CONSTRAINT "user_evaluations_pkey" PRIMARY KEY ("id");



CREATE INDEX "anthropometric_change_log_user_changed_idx" ON "public"."anthropometric_change_log" USING "btree" ("user_id", "changed_at" DESC);



CREATE INDEX "assessments_user_created_idx" ON "public"."assessments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "exercise_logs_user_tanggal_created_at_idx" ON "public"."exercise_logs" USING "btree" ("user_id", "tanggal" DESC, "created_at" DESC);



CREATE INDEX "food_logs_user_tanggal_created_idx" ON "public"."food_logs" USING "btree" ("user_id", "tanggal" DESC, "created_at" DESC);



CREATE INDEX "food_logs_user_tanggal_idx" ON "public"."food_logs" USING "btree" ("user_id", "tanggal" DESC);



CREATE INDEX "user_evaluations_user_date_to_idx" ON "public"."user_evaluations" USING "btree" ("user_id", "date_to" DESC, "created_at" DESC);



CREATE OR REPLACE TRIGGER "assessments_change_log_ins" AFTER INSERT ON "public"."assessments" FOR EACH ROW EXECUTE FUNCTION "public"."trg_assessments_change_log"();



CREATE OR REPLACE TRIGGER "body_measurements_change_log_ins" AFTER INSERT ON "public"."body_measurements" FOR EACH ROW EXECUTE FUNCTION "public"."trg_body_measurements_change_log"();



CREATE OR REPLACE TRIGGER "body_measurements_change_log_upd" AFTER UPDATE ON "public"."body_measurements" FOR EACH ROW EXECUTE FUNCTION "public"."trg_body_measurements_change_log"();



CREATE OR REPLACE TRIGGER "profiles_antrop_change_log_upd" AFTER UPDATE OF "berat_badan", "tinggi_badan" ON "public"."profiles" FOR EACH ROW WHEN ((("old"."berat_badan" IS DISTINCT FROM "new"."berat_badan") OR ("old"."tinggi_badan" IS DISTINCT FROM "new"."tinggi_badan"))) EXECUTE FUNCTION "public"."trg_profiles_antrop_change_log"();



ALTER TABLE ONLY "public"."anthropometric_change_log"
    ADD CONSTRAINT "anthropometric_change_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."anthropometric_change_log"
    ADD CONSTRAINT "anthropometric_change_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_logs"
    ADD CONSTRAINT "exercise_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_log_items"
    ADD CONSTRAINT "food_log_items_food_log_id_fkey" FOREIGN KEY ("food_log_id") REFERENCES "public"."food_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_log_items"
    ADD CONSTRAINT "food_log_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."food_units"("id");



ALTER TABLE ONLY "public"."food_logs"
    ADD CONSTRAINT "food_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_units"
    ADD CONSTRAINT "food_units_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_evaluations"
    ADD CONSTRAINT "user_evaluations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_evaluations"
    ADD CONSTRAINT "user_evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."anthropometric_change_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anthropometric_change_log_klien_select" ON "public"."anthropometric_change_log" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "anthropometric_change_log_staff_all" ON "public"."anthropometric_change_log" USING ("public"."jwt_is_staff"());



ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessments_klien_select" ON "public"."assessments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "assessments_staff_all" ON "public"."assessments" USING ("public"."jwt_is_staff"());



ALTER TABLE "public"."body_measurements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercise_logs_klien" ON "public"."exercise_logs" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "exercise_logs_staff_read" ON "public"."exercise_logs" FOR SELECT USING ("public"."jwt_is_staff"());



CREATE POLICY "food_items_klien" ON "public"."food_log_items" USING ("public"."food_log_owned_by_me"("food_log_id")) WITH CHECK ("public"."food_log_owned_by_me"("food_log_id"));



CREATE POLICY "food_items_staff_read" ON "public"."food_log_items" FOR SELECT USING ("public"."jwt_is_staff"());



ALTER TABLE "public"."food_log_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "food_units_read" ON "public"."food_units" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "food_units_staff" ON "public"."food_units" USING ("public"."jwt_is_staff"());



CREATE POLICY "foodlogs_klien" ON "public"."food_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "foodlogs_staff_read" ON "public"."food_logs" FOR SELECT USING ("public"."jwt_is_staff"());



CREATE POLICY "measurements_klien_read" ON "public"."body_measurements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "measurements_staff" ON "public"."body_measurements" USING ("public"."jwt_is_staff"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_self" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK ((("auth"."uid"() = "id") AND ("role" = ( SELECT "p"."role"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))) AND ("is_active" = ( SELECT "p"."is_active"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())))));



CREATE POLICY "profiles_staff" ON "public"."profiles" USING ("public"."jwt_is_staff"());



ALTER TABLE "public"."user_evaluations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_evaluations_klien_select" ON "public"."user_evaluations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_evaluations_staff_all" ON "public"."user_evaluations" USING ("public"."jwt_is_staff"());





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."admin_get_user_phone"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_user_phone"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_user_phone"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_list_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_profiles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."append_antrop_change"("p_user_id" "uuid", "p_field" "text", "p_old" "text", "p_new" "text", "p_changed_by" "uuid", "p_source" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."append_antrop_change"("p_user_id" "uuid", "p_field" "text", "p_old" "text", "p_new" "text", "p_changed_by" "uuid", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."append_antrop_change"("p_user_id" "uuid", "p_field" "text", "p_old" "text", "p_new" "text", "p_changed_by" "uuid", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_antrop_change"("p_user_id" "uuid", "p_field" "text", "p_old" "text", "p_new" "text", "p_changed_by" "uuid", "p_source" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bmi_from_bb_tb"("bb" numeric, "tb" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bmi_from_bb_tb"("bb" numeric, "tb" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."bmi_from_bb_tb"("bb" numeric, "tb" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bmi_from_bb_tb"("bb" numeric, "tb" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."food_log_owned_by_me"("p_food_log_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."food_log_owned_by_me"("p_food_log_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."food_log_owned_by_me"("p_food_log_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."food_log_owned_by_me"("p_food_log_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jwt_is_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jwt_is_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."jwt_is_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jwt_is_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_assessments_change_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_assessments_change_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_assessments_change_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_body_measurements_change_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_body_measurements_change_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_body_measurements_change_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_profiles_antrop_change_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_profiles_antrop_change_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_profiles_antrop_change_log"() TO "service_role";


















GRANT ALL ON TABLE "public"."anthropometric_change_log" TO "anon";
GRANT ALL ON TABLE "public"."anthropometric_change_log" TO "authenticated";
GRANT ALL ON TABLE "public"."anthropometric_change_log" TO "service_role";



GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."body_measurements" TO "anon";
GRANT ALL ON TABLE "public"."body_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."body_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_logs" TO "anon";
GRANT ALL ON TABLE "public"."exercise_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_logs" TO "service_role";



GRANT ALL ON TABLE "public"."food_log_items" TO "anon";
GRANT ALL ON TABLE "public"."food_log_items" TO "authenticated";
GRANT ALL ON TABLE "public"."food_log_items" TO "service_role";



GRANT ALL ON TABLE "public"."food_logs" TO "anon";
GRANT ALL ON TABLE "public"."food_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."food_logs" TO "service_role";



GRANT ALL ON TABLE "public"."food_name_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."food_name_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."food_name_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."food_units" TO "anon";
GRANT ALL ON TABLE "public"."food_units" TO "authenticated";
GRANT ALL ON TABLE "public"."food_units" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."user_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_evaluations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































