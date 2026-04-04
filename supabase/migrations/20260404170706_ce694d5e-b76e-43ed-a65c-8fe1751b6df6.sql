
DROP VIEW IF EXISTS public.vw_reimpressao_vendas;
CREATE VIEW public.vw_reimpressao_vendas WITH (security_invoker=on) AS
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
