create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  subject text not null default 'Ogólne',
  content text not null default '',
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.notes enable row level security;
alter table public.admin_users enable row level security;

grant select, insert, update, delete on public.notes to authenticated;
grant select on public.admin_users to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Authenticated users can read notes" on public.notes;
create policy "Authenticated users can read notes"
  on public.notes for select to authenticated using (true);

drop policy if exists "Users can add their own notes" on public.notes;
create policy "Users can add their own notes"
  on public.notes for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "Authors and admins can update notes" on public.notes;
create policy "Authors and admins can update notes"
  on public.notes for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Authors and admins can delete notes" on public.notes;
create policy "Authors and admins can delete notes"
  on public.notes for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Users can see their own admin status" on public.admin_users;
create policy "Users can see their own admin status"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-files',
  'note-files',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in users can read note files" on storage.objects;
create policy "Signed-in users can read note files"
  on storage.objects for select to authenticated
  using (bucket_id = 'note-files');

drop policy if exists "Users can upload to their own folder" on storage.objects;
create policy "Users can upload to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'note-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Authors and admins can delete note files" on storage.objects;
create policy "Authors and admins can delete note files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'note-files'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- After creating your account, run this once with the email you signed up with:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'you@example.com';