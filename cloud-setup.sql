-- ═══════════════════════════════════════════════════════════════
-- Greenergy O&M — ฐานข้อมูลกลางของทีม (Supabase)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว)
-- ═══════════════════════════════════════════════════════════════

-- 1) ตารางผู้ใช้ + สิทธิ์ (ผู้สมัครใหม่ = viewer เสมอ จนกว่าผู้ดูแลจะเปลี่ยน)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

-- 2) ตารางข้อมูลกลาง: 1 แถวต่อ 1 ชุดข้อมูล (records, ppm, projects, options, opdir, flow)
create table if not exists public.app_data (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 3) ประวัติทุกเวอร์ชัน (กันข้อมูลหาย/ย้อนกลับได้) เก็บ 90 วัน
create table if not exists public.app_data_history (
  id bigserial primary key,
  key text not null, value jsonb, version int, updated_by text,
  saved_at timestamptz not null default now()
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  insert into public.profiles(id, email, role) values (new.id, new.email, 'viewer') on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.keep_history() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  insert into public.app_data_history(key, value, version, updated_by) values (old.key, old.value, old.version, old.updated_by);
  delete from public.app_data_history where saved_at < now() - interval '90 days';
  return new;
end $$;
drop trigger if exists app_data_history_trg on public.app_data;
create trigger app_data_history_trg before update on public.app_data for each row execute function public.keep_history();

-- 4) สิทธิ์ (Row Level Security) — ไม่มีนโยบายลบ = ลบข้อมูลไม่ได้
alter table public.profiles enable row level security;
alter table public.app_data enable row level security;
alter table public.app_data_history enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (id = auth.uid() or public.my_role() = 'admin');
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- ทุกคนที่ล็อกอินอ่านได้ ยกเว้นแถว 'flow' (Flow URL ของ Power Automate) อ่านได้เฉพาะ admin/editor
drop policy if exists "data_select" on public.app_data;
create policy "data_select" on public.app_data for select using (
  public.my_role() is not null and (key <> 'flow' or public.my_role() in ('admin','editor')));
drop policy if exists "data_insert" on public.app_data;
create policy "data_insert" on public.app_data for insert with check (public.my_role() in ('admin','editor'));
drop policy if exists "data_update" on public.app_data;
create policy "data_update" on public.app_data for update using (public.my_role() in ('admin','editor')) with check (public.my_role() in ('admin','editor'));
drop policy if exists "history_admin_select" on public.app_data_history;
create policy "history_admin_select" on public.app_data_history for select using (public.my_role() = 'admin');

-- 5) อัปเดตสดให้ทุกคนเห็นพร้อมกัน
do $$ begin
  alter publication supabase_realtime add table public.app_data;
exception when duplicate_object then null; end $$;

-- 6) หลังสมัครบัญชีของคุณเองแล้ว ให้รันบรรทัดนี้ (แก้อีเมล) เพื่อตั้งตัวเองเป็นผู้ดูแล:
-- update public.profiles set role = 'admin' where email = 'you@company.com';

-- กู้ข้อมูลย้อนหลัง (ตัวอย่าง): ดูเวอร์ชันเก่าของ records
-- select version, saved_at, updated_by from public.app_data_history where key = 'records' order by saved_at desc limit 20;
