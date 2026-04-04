
-- Add kit columns to fichas_produtos
ALTER TABLE public.fichas_produtos
  ADD COLUMN IF NOT EXISTS kit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantidade_a_baixar integer NOT NULL DEFAULT 1;

-- Recreate vw_estoque to account for kit multiplier
DROP VIEW IF EXISTS public.vw_estoque;
CREATE VIEW public.vw_estoque AS
SELECT
  p.id AS produto_id,
  p.nome_produto,
  p.categoria_id,
  c.nome_categoria,
  p.ativo,
  p.estoque_negativo,
  p.kit,
  p.quantidade_a_baixar,
  COALESCE(e.total_comprado, 0) AS quantidade_comprada,
  COALESCE(v.total_vendido, 0) AS quantidade_vendida,
  COALESCE(e.total_comprado, 0) - COALESCE(v.total_vendido, 0) AS estoque_atual,
  e.ultimo_valor_comprado,
  v.ultimo_valor_venda,
  p.valor AS valor_venda_atual
FROM public.fichas_produtos p
LEFT JOIN public.fichas_categorias c ON c.id = p.categoria_id
LEFT JOIN (
  SELECT
    ei.produto_id,
    SUM(ei.quantidade) AS total_comprado,
    (array_agg(ei.valor_comprado ORDER BY ei.created_at DESC))[1] AS ultimo_valor_comprado
  FROM public.entradas_mercadoria_itens ei
  GROUP BY ei.produto_id
) e ON e.produto_id = p.id
LEFT JOIN (
  SELECT
    fi.produto_id,
    SUM(
      CASE WHEN fp.kit THEN fi.quantidade * fp.quantidade_a_baixar
           ELSE fi.quantidade
      END
    ) AS total_vendido,
    (array_agg(fi.valor_unitario ORDER BY fi.created_at DESC))[1] AS ultimo_valor_venda
  FROM public.fichas_impressoes fi
  JOIN public.fichas_produtos fp ON fp.id = fi.produto_id
  GROUP BY fi.produto_id
) v ON v.produto_id = p.id;
