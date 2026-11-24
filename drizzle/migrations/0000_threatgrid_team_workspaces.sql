
create type public.workspace_role as enum ('owner','admin','analyst','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.workspaces to authenticated;
grant all on public.workspaces to service_role;
alter table public.workspaces enable row level security;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role public.workspace_role not null default 'analyst',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
grant select, update, delete on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;
alter table public.workspace_members enable row level security;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  scenario text not null default '',
  type text not null default 'VM',
  vulnerability numeric(3,1) not null default 5 check (vulnerability between 0 and 10),
  criticality int not null default 3 check (criticality between 1 and 5),
  exposure text not null default 'internal' check (exposure in ('isolated','internal','campus','internet')),
  controls text[] not null default '{}',
  links text[] not null default '{}',
  cvss jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
grant select, insert, update, delete on public.assets to authenticated;
grant all on public.assets to service_role;
alter table public.assets enable row level security;
create index assets_ws_idx on public.assets(workspace_id);

create table public.activity_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid,
  action text not null,
  asset_id uuid,
  asset_name text,
  field text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
grant select on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create index activity_ws_idx on public.activity_log(workspace_id, created_at desc);

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  label text not null,
  total_assets int not null,
  avg_score numeric(5,1) not null,
  critical_count int not null,
  high_count int not null,
  medium_count int not null default 0,
  low_count int not null default 0,
  risk_reduction numeric(5,1) not null default 0,
  simulated boolean not null default false
);
grant select, insert, delete on public.snapshots to authenticated;
grant all on public.snapshots to service_role;
alter table public.snapshots enable row level security;

-- helpers
create or replace function public.ws_role(_ws uuid, _uid uuid)
returns public.workspace_role language sql stable security definer set search_path = public as $$
  select role from public.workspace_members where workspace_id = _ws and user_id = _uid
$$;
create or replace function public.is_ws_member(_ws uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = _ws and user_id = _uid)
$$;
create or replace function public.can_edit_ws(_ws uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.ws_role(_ws, _uid) in ('owner','admin','analyst'), false)
$$;
create or replace function public.can_manage_ws(_ws uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.ws_role(_ws, _uid) in ('owner','admin'), false)
$$;
create or replace function public.shares_ws(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m1 join public.workspace_members m2 using (workspace_id)
    where m1.user_id = _a and m2.user_id = _b)
$$;

-- policies
create policy "profiles self or teammates" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_ws(auth.uid(), id));
create policy "profiles insert self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "ws members read" on public.workspaces for select to authenticated using (public.is_ws_member(id, auth.uid()));
create policy "ws managers update" on public.workspaces for update to authenticated using (public.can_manage_ws(id, auth.uid())) with check (public.can_manage_ws(id, auth.uid()));
create policy "ws owner delete" on public.workspaces for delete to authenticated using (public.ws_role(id, auth.uid()) = 'owner');

create policy "members read" on public.workspace_members for select to authenticated using (public.is_ws_member(workspace_id, auth.uid()));
create policy "managers update roles" on public.workspace_members for update to authenticated
  using (public.can_manage_ws(workspace_id, auth.uid()) and role <> 'owner')
  with check (public.can_manage_ws(workspace_id, auth.uid()) and role <> 'owner');
create policy "managers remove or self leave" on public.workspace_members for delete to authenticated
  using ((public.can_manage_ws(workspace_id, auth.uid()) and role <> 'owner') or (user_id = auth.uid() and role <> 'owner'));

create policy "assets read" on public.assets for select to authenticated using (public.is_ws_member(workspace_id, auth.uid()));
create policy "assets insert" on public.assets for insert to authenticated with check (public.can_edit_ws(workspace_id, auth.uid()));
create policy "assets update" on public.assets for update to authenticated using (public.can_edit_ws(workspace_id, auth.uid())) with check (public.can_edit_ws(workspace_id, auth.uid()));
create policy "assets delete" on public.assets for delete to authenticated using (public.can_edit_ws(workspace_id, auth.uid()));

create policy "activity read" on public.activity_log for select to authenticated using (public.is_ws_member(workspace_id, auth.uid()));

create policy "snapshots read" on public.snapshots for select to authenticated using (public.is_ws_member(workspace_id, auth.uid()));
create policy "snapshots insert" on public.snapshots for insert to authenticated with check (public.can_edit_ws(workspace_id, auth.uid()) and simulated = false and created_by = auth.uid());
create policy "snapshots delete" on public.snapshots for delete to authenticated using (public.can_manage_ws(workspace_id, auth.uid()));

-- prevent role escalation to owner via update
create or replace function public.guard_member_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role = 'owner' then raise exception 'Cannot assign owner role'; end if;
  if new.workspace_id <> old.workspace_id or new.user_id <> old.user_id then raise exception 'Immutable'; end if;
  return new;
end $$;
create trigger guard_member_update before update on public.workspace_members for each row execute function public.guard_member_update();

-- activity logging trigger (immutable history)
create or replace function public.log_asset_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare f text; o jsonb; n jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log(workspace_id,user_id,action,asset_id,asset_name,new_value)
    values (new.workspace_id, auth.uid(), 'created', new.id, new.name, to_jsonb(new) - 'workspace_id' - 'created_at' - 'updated_at' - 'updated_by' - 'sort_order');
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.activity_log(workspace_id,user_id,action,asset_id,asset_name,old_value)
    values (old.workspace_id, auth.uid(), 'deleted', old.id, old.name, to_jsonb(old) - 'workspace_id' - 'created_at' - 'updated_at' - 'updated_by' - 'sort_order');
    return old;
  end if;
  foreach f in array array['name','scenario','type','vulnerability','criticality','exposure','controls','links','cvss'] loop
    o := to_jsonb(old) -> f; n := to_jsonb(new) -> f;
    if o is distinct from n then
      insert into public.activity_log(workspace_id,user_id,action,asset_id,asset_name,field,old_value,new_value)
      values (new.workspace_id, auth.uid(), 'updated', new.id, new.name, f, o, n);
    end if;
  end loop;
  return new;
end $$;
create trigger assets_log after insert or update or delete on public.assets for each row execute function public.log_asset_change();

create or replace function public.touch_asset()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
create trigger assets_touch before update on public.assets for each row execute function public.touch_asset();

-- profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- create workspace with 15 demo assets + simulated history
create or replace function public.create_workspace(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid; uid uuid := auth.uid(); i uuid[];
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if _name is null or char_length(trim(_name)) < 2 then raise exception 'Name too short'; end if;
  insert into public.workspaces(name, created_by) values (trim(_name), uid) returning id into ws;
  insert into public.workspace_members(workspace_id, user_id, role) values (ws, uid, 'owner');
  i := array(select gen_random_uuid() from generate_series(1,15));
  insert into public.assets(id,workspace_id,name,scenario,type,vulnerability,criticality,exposure,controls,links,sort_order) values
  (i[1],ws,'LAB-WEB-01 (DVWA)','Web App Pentesting','Web application',9.1,4,'campus','{}',array[i[2]::text,i[14]::text],1),
  (i[2],ws,'LAB-DB-02 MySQL','SQL Injection Lab','Database',8.2,5,'internal','{}',array[i[7]::text],2),
  (i[3],ws,'Kali Attack Box 07','Ethical Hacking','Security testing machine',4.3,2,'campus','{patch}',array[i[4]::text,i[1]::text],3),
  (i[4],ws,'Metasploitable2-A','Exploit Development','Linux server',9.8,3,'isolated','{}','{}',4),
  (i[5],ws,'Moodle Staging','LMS Hardening','Web application',6.5,5,'internet','{patch}',array[i[2]::text,i[9]::text],5),
  (i[6],ws,'Cisco ASA Lab FW','Network Defence','Firewall',7.4,5,'campus','{}',array[i[7]::text,i[12]::text],6),
  (i[7],ws,'AD-DC-LAB','Active Directory Attacks','Active Directory server',8.8,5,'internal','{}',array[i[12]::text,i[9]::text],7),
  (i[8],ws,'IoT Camera Cluster','IoT Security','IoT device',7.9,2,'campus','{}',array[i[15]::text],8),
  (i[9],ws,'SIEM Splunk Node','SOC Analysis','Linux server',5.2,4,'internal','{patch,mfa}',array[i[7]::text],9),
  (i[10],ws,'Raspberry Pi Honeypot','Threat Intelligence','Linux server',6.1,1,'internet','{}',array[i[9]::text],10),
  (i[11],ws,'Wi-Fi AP LAB-3F','Wireless Security','Wi-Fi access point',7.0,3,'campus','{}',array[i[7]::text,i[8]::text,i[3]::text],11),
  (i[12],ws,'Forensics Workstation','Digital Forensics','Windows client',3.8,4,'isolated','{patch,edr}','{}',12),
  (i[13],ws,'Docker CI Runner','DevSecOps','Virtualization host',8.5,4,'internet','{}',array[i[6]::text,i[14]::text],13),
  (i[14],ws,'Juice Shop VM','Secure Coding','Web application',9.3,2,'internal','{}',array[i[2]::text],14),
  (i[15],ws,'SCADA Simulator','ICS Security','PLC simulator',8.9,5,'isolated','{}','{}',15);
  delete from public.activity_log where workspace_id = ws;
  insert into public.activity_log(workspace_id,user_id,action,asset_name) values (ws, uid, 'workspace created with 15 demo assets', null);
  insert into public.snapshots(workspace_id,created_by,created_at,label,total_assets,avg_score,critical_count,high_count,medium_count,low_count,risk_reduction,simulated)
  select ws, uid, now() - ((8 - g) * interval '7 days'), 'Wk ' || g || ' (simulated)', 15,
    (array[46.2,44.8,42.1,40.3,39.0,37.4,36.1,35.2])[g], (array[5,5,4,4,3,3,3,2])[g], (array[5,5,5,4,4,4,4,4])[g],
    (array[3,3,4,4,5,5,4,5])[g], (array[2,2,2,3,3,3,4,4])[g], (array[0,3.0,8.9,12.8,15.6,19.0,21.9,23.8])[g], true
  from generate_series(1,8) g;
  return ws;
end $$;
grant execute on function public.create_workspace(text) to authenticated;

create or replace function public.join_workspace(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select id into ws from public.workspaces where invite_code = upper(trim(_code));
  if ws is null then raise exception 'Invalid invite code'; end if;
  insert into public.workspace_members(workspace_id, user_id, role) values (ws, uid, 'analyst') on conflict do nothing;
  insert into public.activity_log(workspace_id,user_id,action) values (ws, uid, 'joined the workspace');
  return ws;
end $$;
grant execute on function public.join_workspace(text) to authenticated;

revoke execute on function public.ws_role(uuid,uuid), public.is_ws_member(uuid,uuid), public.can_edit_ws(uuid,uuid), public.can_manage_ws(uuid,uuid), public.shares_ws(uuid,uuid) from anon, public;
grant execute on function public.ws_role(uuid,uuid), public.is_ws_member(uuid,uuid), public.can_edit_ws(uuid,uuid), public.can_manage_ws(uuid,uuid), public.shares_ws(uuid,uuid) to authenticated;

alter publication supabase_realtime add table public.assets;
alter publication supabase_realtime add table public.activity_log;
alter publication supabase_realtime add table public.snapshots;
alter publication supabase_realtime add table public.workspace_members;
