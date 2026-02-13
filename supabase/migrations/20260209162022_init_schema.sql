
  create table "public"."page_audits" (
    "id" uuid not null default gen_random_uuid(),
    "page_id" uuid not null,
    "scan_id" text,
    "report_json" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."page_audits" enable row level security;


  create table "public"."pages" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "url" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."pages" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "url" text not null,
    "name" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."projects" enable row level security;


  create table "public"."report_entitlements" (
    "report_id" text not null,
    "unlocked" boolean not null default false,
    "stripe_session_id" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."report_entitlements" enable row level security;


  create table "public"."scans" (
    "id" text not null,
    "project_id" uuid,
    "user_id" uuid,
    "url" text not null,
    "status" text not null,
    "device" text not null,
    "visibility" text not null,
    "crawl_enabled" boolean not null default false,
    "crawl_max_links" integer not null default 1,
    "manage_token_hash" text,
    "summary_json" jsonb,
    "report_json" jsonb,
    "error" text,
    "created_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone
      );


alter table "public"."scans" enable row level security;


  create table "public"."subscriptions" (
    "user_id" uuid not null,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "price_id" text,
    "plan" text not null default 'free'::text,
    "status" text not null default 'inactive'::text,
    "current_period_end" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."subscriptions" enable row level security;

CREATE UNIQUE INDEX page_audits_pkey ON public.page_audits USING btree (id);

CREATE UNIQUE INDEX pages_pkey ON public.pages USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX report_entitlements_pkey ON public.report_entitlements USING btree (report_id);

CREATE INDEX scans_created_at_idx ON public.scans USING btree (created_at DESC);

CREATE UNIQUE INDEX scans_pkey ON public.scans USING btree (id);

CREATE INDEX scans_project_id_idx ON public.scans USING btree (project_id);

CREATE INDEX scans_user_id_idx ON public.scans USING btree (user_id);

CREATE INDEX scans_visibility_idx ON public.scans USING btree (visibility);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (user_id);

alter table "public"."page_audits" add constraint "page_audits_pkey" PRIMARY KEY using index "page_audits_pkey";

alter table "public"."pages" add constraint "pages_pkey" PRIMARY KEY using index "pages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."report_entitlements" add constraint "report_entitlements_pkey" PRIMARY KEY using index "report_entitlements_pkey";

alter table "public"."scans" add constraint "scans_pkey" PRIMARY KEY using index "scans_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."page_audits" add constraint "page_audits_page_id_fkey" FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE not valid;

alter table "public"."page_audits" validate constraint "page_audits_page_id_fkey";

alter table "public"."page_audits" add constraint "page_audits_scan_id_fkey" FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE not valid;

alter table "public"."page_audits" validate constraint "page_audits_scan_id_fkey";

alter table "public"."pages" add constraint "pages_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."pages" validate constraint "pages_project_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."projects" add constraint "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_user_id_fkey";

alter table "public"."scans" add constraint "scans_device_check" CHECK ((device = ANY (ARRAY['mobile'::text, 'desktop'::text]))) not valid;

alter table "public"."scans" validate constraint "scans_device_check";

alter table "public"."scans" add constraint "scans_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."scans" validate constraint "scans_project_id_fkey";

alter table "public"."scans" add constraint "scans_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'done'::text, 'failed'::text]))) not valid;

alter table "public"."scans" validate constraint "scans_status_check";

alter table "public"."scans" add constraint "scans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."scans" validate constraint "scans_user_id_fkey";

alter table "public"."scans" add constraint "scans_visibility_check" CHECK ((visibility = ANY (ARRAY['unlisted'::text, 'public'::text]))) not valid;

alter table "public"."scans" validate constraint "scans_visibility_check";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'inactive')
  on conflict (user_id) do nothing;
  return new;
end;
$function$
;

grant delete on table "public"."page_audits" to "anon";

grant insert on table "public"."page_audits" to "anon";

grant references on table "public"."page_audits" to "anon";

grant select on table "public"."page_audits" to "anon";

grant trigger on table "public"."page_audits" to "anon";

grant truncate on table "public"."page_audits" to "anon";

grant update on table "public"."page_audits" to "anon";

grant delete on table "public"."page_audits" to "authenticated";

grant insert on table "public"."page_audits" to "authenticated";

grant references on table "public"."page_audits" to "authenticated";

grant select on table "public"."page_audits" to "authenticated";

grant trigger on table "public"."page_audits" to "authenticated";

grant truncate on table "public"."page_audits" to "authenticated";

grant update on table "public"."page_audits" to "authenticated";

grant delete on table "public"."page_audits" to "service_role";

grant insert on table "public"."page_audits" to "service_role";

grant references on table "public"."page_audits" to "service_role";

grant select on table "public"."page_audits" to "service_role";

grant trigger on table "public"."page_audits" to "service_role";

grant truncate on table "public"."page_audits" to "service_role";

grant update on table "public"."page_audits" to "service_role";

grant delete on table "public"."pages" to "anon";

grant insert on table "public"."pages" to "anon";

grant references on table "public"."pages" to "anon";

grant select on table "public"."pages" to "anon";

grant trigger on table "public"."pages" to "anon";

grant truncate on table "public"."pages" to "anon";

grant update on table "public"."pages" to "anon";

grant delete on table "public"."pages" to "authenticated";

grant insert on table "public"."pages" to "authenticated";

grant references on table "public"."pages" to "authenticated";

grant select on table "public"."pages" to "authenticated";

grant trigger on table "public"."pages" to "authenticated";

grant truncate on table "public"."pages" to "authenticated";

grant update on table "public"."pages" to "authenticated";

grant delete on table "public"."pages" to "service_role";

grant insert on table "public"."pages" to "service_role";

grant references on table "public"."pages" to "service_role";

grant select on table "public"."pages" to "service_role";

grant trigger on table "public"."pages" to "service_role";

grant truncate on table "public"."pages" to "service_role";

grant update on table "public"."pages" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."report_entitlements" to "anon";

grant insert on table "public"."report_entitlements" to "anon";

grant references on table "public"."report_entitlements" to "anon";

grant select on table "public"."report_entitlements" to "anon";

grant trigger on table "public"."report_entitlements" to "anon";

grant truncate on table "public"."report_entitlements" to "anon";

grant update on table "public"."report_entitlements" to "anon";

grant delete on table "public"."report_entitlements" to "authenticated";

grant insert on table "public"."report_entitlements" to "authenticated";

grant references on table "public"."report_entitlements" to "authenticated";

grant select on table "public"."report_entitlements" to "authenticated";

grant trigger on table "public"."report_entitlements" to "authenticated";

grant truncate on table "public"."report_entitlements" to "authenticated";

grant update on table "public"."report_entitlements" to "authenticated";

grant delete on table "public"."report_entitlements" to "service_role";

grant insert on table "public"."report_entitlements" to "service_role";

grant references on table "public"."report_entitlements" to "service_role";

grant select on table "public"."report_entitlements" to "service_role";

grant trigger on table "public"."report_entitlements" to "service_role";

grant truncate on table "public"."report_entitlements" to "service_role";

grant update on table "public"."report_entitlements" to "service_role";

grant delete on table "public"."scans" to "anon";

grant insert on table "public"."scans" to "anon";

grant references on table "public"."scans" to "anon";

grant select on table "public"."scans" to "anon";

grant trigger on table "public"."scans" to "anon";

grant truncate on table "public"."scans" to "anon";

grant update on table "public"."scans" to "anon";

grant delete on table "public"."scans" to "authenticated";

grant insert on table "public"."scans" to "authenticated";

grant references on table "public"."scans" to "authenticated";

grant select on table "public"."scans" to "authenticated";

grant trigger on table "public"."scans" to "authenticated";

grant truncate on table "public"."scans" to "authenticated";

grant update on table "public"."scans" to "authenticated";

grant delete on table "public"."scans" to "service_role";

grant insert on table "public"."scans" to "service_role";

grant references on table "public"."scans" to "service_role";

grant select on table "public"."scans" to "service_role";

grant trigger on table "public"."scans" to "service_role";

grant truncate on table "public"."scans" to "service_role";

grant update on table "public"."scans" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";


  create policy "page_audits_select_own"
  on "public"."page_audits"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.pages pg
     JOIN public.projects p ON ((p.id = pg.project_id)))
  WHERE ((pg.id = page_audits.page_id) AND (p.user_id = auth.uid())))));



  create policy "pages_insert_own"
  on "public"."pages"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = pages.project_id) AND (p.user_id = auth.uid())))));



  create policy "pages_select_own"
  on "public"."pages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = pages.project_id) AND (p.user_id = auth.uid())))));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "projects_delete_own"
  on "public"."projects"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "projects_insert_own"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "projects_select_own"
  on "public"."projects"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "projects_update_own"
  on "public"."projects"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "report_entitlements_select_all"
  on "public"."report_entitlements"
  as permissive
  for select
  to public
using (true);



  create policy "scans_delete_own"
  on "public"."scans"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "scans_insert_anon"
  on "public"."scans"
  as permissive
  for insert
  to public
with check ((user_id IS NULL));



  create policy "scans_insert_own"
  on "public"."scans"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "scans_select_own"
  on "public"."scans"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "scans_select_public_done"
  on "public"."scans"
  as permissive
  for select
  to public
using (((visibility = 'public'::text) AND (status = 'done'::text)));



  create policy "scans_select_public_or_unlisted_any_status"
  on "public"."scans"
  as permissive
  for select
  to public
using ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text])));



  create policy "scans_select_unlisted_done"
  on "public"."scans"
  as permissive
  for select
  to public
using (((visibility = 'unlisted'::text) AND (status = 'done'::text)));



  create policy "subs_select_own"
  on "public"."subscriptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


