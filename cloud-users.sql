-- ═══════════════════════════════════════════════════════════════
-- Greenergy O&M — ผู้ดูแลระบบสร้างผู้ใช้ (อีเมล + รหัสผ่านครั้งแรก) และกำหนดสิทธิ์เข้าถึง
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว, รันซ้ำได้)
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ข้อมูลเพิ่มของผู้ใช้: ชื่อที่แสดง, บังคับเปลี่ยนรหัสผ่าน, แท็บที่เข้าถึงได้ (null = ทุกแท็บ)
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists must_change_pw boolean not null default false;
alter table public.profiles add column if not exists tabs text[];

-- สร้างผู้ใช้ใหม่ (เฉพาะ admin) — ยืนยันอีเมลให้เลย เข้าสู่ระบบได้ทันที และต้องเปลี่ยนรหัสผ่านตอนเข้าครั้งแรก
create or replace function public.admin_create_user(p_email text, p_password text, p_role text default 'viewer', p_tabs text[] default null, p_name text default null)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as
$$ declare uid uuid := gen_random_uuid(); em text := lower(trim(p_email));
begin
  if public.my_role() is distinct from 'admin' then raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น'; end if;
  if em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'รูปแบบอีเมลไม่ถูกต้อง'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'; end if;
  if p_role not in ('admin', 'editor', 'viewer') then raise exception 'สิทธิ์ไม่ถูกต้อง'; end if;
  if exists (select 1 from auth.users where lower(email) = em) then raise exception 'มีอีเมลนี้ในระบบแล้ว'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());

  insert into public.profiles (id, email, role) values (uid, em, p_role) on conflict (id) do nothing;   -- (ปกติ trigger สร้างให้แล้ว)
  update public.profiles set role = p_role, tabs = p_tabs, display_name = nullif(trim(p_name), ''), must_change_pw = true where id = uid;
  return uid;
end $$;

-- ตั้งรหัสผ่านใหม่ให้ผู้ใช้ (เฉพาะ admin) — ผู้ใช้ต้องเปลี่ยนเองอีกครั้งตอนเข้าระบบ
create or replace function public.admin_set_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as
$$ begin
  if public.my_role() is distinct from 'admin' then raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_id;
  if not found then raise exception 'ไม่พบผู้ใช้'; end if;
  update public.profiles set must_change_pw = true where id = p_id;
end $$;

-- ลบผู้ใช้ (เฉพาะ admin, ลบตัวเองไม่ได้) — ข้อมูลงานของทีมไม่ถูกลบ
create or replace function public.admin_delete_user(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth as
$$ begin
  if public.my_role() is distinct from 'admin' then raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น'; end if;
  if p_id = auth.uid() then raise exception 'ลบบัญชีของตัวเองไม่ได้'; end if;
  delete from auth.users where id = p_id;
end $$;

-- ผู้ใช้เปลี่ยนรหัสผ่านเองสำเร็จแล้ว → ปลดการบังคับเปลี่ยน
create or replace function public.password_changed()
returns void language sql security definer set search_path = public as
$$ update public.profiles set must_change_pw = false where id = auth.uid() $$;

revoke all on function public.admin_create_user(text, text, text, text[], text) from public, anon;
revoke all on function public.admin_set_password(uuid, text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
revoke all on function public.password_changed() from public, anon;
grant execute on function public.admin_create_user(text, text, text, text[], text) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.password_changed() to authenticated;

notify pgrst, 'reload schema';
