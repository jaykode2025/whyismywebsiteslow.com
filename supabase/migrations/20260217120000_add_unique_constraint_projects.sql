-- Add unique constraint on projects(user_id, url) for upsert support
-- Required by: src/pages/api/scan.ts:93 (onConflict: 'user_id,url')

alter table "public"."projects" 
  add constraint "projects_user_id_url_key" unique (user_id, url);

-- Add index to support the unique constraint (improves query performance)
create index if not exists "projects_user_id_url_idx" 
  on "public"."projects" (user_id, url);
