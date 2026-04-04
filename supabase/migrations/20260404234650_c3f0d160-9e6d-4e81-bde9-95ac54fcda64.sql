
ALTER TABLE public.fichas_kits
  ADD COLUMN IF NOT EXISTS nome_kit text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS categoria_id uuid;

-- Make produto_principal_id nullable since kit now has its own name
ALTER TABLE public.fichas_kits
  ALTER COLUMN produto_principal_id DROP NOT NULL;
