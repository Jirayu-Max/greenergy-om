-- ═══════════════════════════════════════════════════════════════
-- Greenergy O&M — ลดขนาดประวัติข้อมูล (app_data_history) ไม่ให้ฐานข้อมูลเต็ม
-- เดิม: เก็บสำเนาทั้งชุดทุกครั้งที่บันทึก เก็บ 90 วัน
-- ใหม่: เก็บชุดละไม่เกิน 1 เวอร์ชันต่อชั่วโมง เก็บ 30 วัน
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run (รันซ้ำได้)
-- ═══════════════════════════════════════════════════════════════

create index if not exists app_data_history_key_saved on public.app_data_history (key, saved_at desc);

create or replace function public.keep_history() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if old.value is distinct from new.value
     and not exists (select 1 from public.app_data_history where key = old.key and saved_at > now() - interval '1 hour') then
    insert into public.app_data_history(key, value, version, updated_by) values (old.key, old.value, old.version, old.updated_by);
  end if;
  delete from public.app_data_history where saved_at < now() - interval '30 days';
  return new;
end $$;

-- ลดประวัติที่มีอยู่แล้ว: เหลือเวอร์ชันแรกของแต่ละชั่วโมง และไม่เกิน 30 วัน
delete from public.app_data_history where saved_at < now() - interval '30 days';
delete from public.app_data_history h using (
  select id, row_number() over (partition by key, date_trunc('hour', saved_at) order by saved_at) as rn from public.app_data_history
) x where h.id = x.id and x.rn > 1;

-- ดูขนาดหลังลด (พื้นที่ว่างจะถูกนำกลับมาใช้ใหม่อัตโนมัติ)
select pg_size_pretty(pg_total_relation_size('public.app_data'))         as app_data_size,
       pg_size_pretty(pg_total_relation_size('public.app_data_history')) as history_size,
       (select count(*) from public.app_data_history)                   as history_rows,
       pg_size_pretty(pg_database_size(current_database()))             as database_size;
