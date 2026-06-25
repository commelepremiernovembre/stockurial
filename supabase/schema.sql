-- ─────────────────────────────────────────────
-- STOCKURIAL — Schéma Supabase
-- À coller dans Settings → SQL Editor → New query
-- ─────────────────────────────────────────────

-- Extension pour la recherche vectorielle (future)
create extension if not exists vector;

-- ── TABLE FICHES ──────────────────────────────
create table fiches (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Statut
  statut        text not null default 'incomplet'
                check (statut in ('incomplet','receptionne','photographie','range','sorti')),
  archived      boolean not null default false,

  -- Bon de dépôt
  photo_depot   text,          -- URL Supabase Storage
  numero_depot  text,          -- OCR du bon de dépôt
  date_depot    timestamptz,   -- date auto à la création

  -- Lot
  photo_etiq    text,          -- URL étiquette
  numero_lot    text,          -- OCR numéro de lot

  -- Objet
  photo_objet   text,          -- URL photo objet
  description   text,          -- Description IA courte

  -- Rack
  photo_rack    text,          -- URL photo numéro rack
  numero_rack   text,          -- OCR numéro rack
  photo_range   text,          -- URL objet rangé dans rack

  -- Notes libres
  notes         text
);

-- ── TABLE HISTORIQUE ──────────────────────────
create table historique (
  id          uuid primary key default gen_random_uuid(),
  fiche_id    uuid not null references fiches(id) on delete cascade,
  created_at  timestamptz not null default now(),
  action      text not null,   -- 'creation', 'modification', 'statut', 'archivage'
  champ       text,            -- champ modifié
  avant       text,            -- valeur avant
  apres       text             -- valeur après
);

-- ── INDEXES ───────────────────────────────────
create index on fiches(numero_lot);
create index on fiches(numero_depot);
create index on fiches(numero_rack);
create index on fiches(statut);
create index on fiches(archived);
create index on fiches(created_at desc);
create index on historique(fiche_id);

-- ── TRIGGER updated_at ────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger fiches_updated_at
  before update on fiches
  for each row execute function set_updated_at();

-- ── STORAGE BUCKET ────────────────────────────
insert into storage.buckets (id, name, public)
values ('stockurial-photos', 'stockurial-photos', true)
on conflict do nothing;

-- Policy : lecture publique
create policy "Lecture publique photos"
  on storage.objects for select
  using (bucket_id = 'stockurial-photos');

-- Policy : upload authentifié (anon inclus pour simplifier)
create policy "Upload photos"
  on storage.objects for insert
  with check (bucket_id = 'stockurial-photos');

create policy "Delete photos"
  on storage.objects for delete
  using (bucket_id = 'stockurial-photos');

-- ── RLS (Row Level Security) ──────────────────
-- Désactivé pour l'instant (accès par code partagé géré côté app)
alter table fiches disable row level security;
alter table historique disable row level security;
