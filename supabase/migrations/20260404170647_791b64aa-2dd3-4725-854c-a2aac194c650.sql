
-- Adicionar colunas de rastreamento de origem na fichas_impressas
ALTER TABLE public.fichas_impressas ADD COLUMN IF NOT EXISTS codigo_venda text;
ALTER TABLE public.fichas_impressas ADD COLUMN IF NOT EXISTS comanda_id uuid;
ALTER TABLE public.fichas_impressas ADD COLUMN IF NOT EXISTS comanda_numero text;
ALTER TABLE public.fichas_impressas ADD COLUMN IF NOT EXISTS pulseira_id uuid;
ALTER TABLE public.fichas_impressas ADD COLUMN IF NOT EXISTS pulseira_numero text;

-- Criar view consolidada para reimpressão de vendas
CREATE OR REPLACE VIEW public.vw_reimpressao_vendas AS
SELECT
  id,
  COALESCE(codigo_venda, id::text) AS codigo_venda,
  created_at AS data_venda,
  nome_cliente,
  nome_atendente,
  produto_id,
  produto_nome,
  categoria_id,
  categoria_nome,
  quantidade,
  valor_unitario,
  valor_total,
  CASE
    WHEN pulseira_id IS NOT NULL OR pulseira_numero IS NOT NULL THEN 'pulseira'
    WHEN comanda_id IS NOT NULL OR comanda_numero IS NOT NULL THEN 'comanda'
    ELSE 'venda_unica'
  END AS origem_venda,
  comanda_id,
  comanda_numero,
  pulseira_id,
  pulseira_numero
FROM public.fichas_impressas
ORDER BY created_at DESC;
