
-- Add valor column to fichas_kits
ALTER TABLE public.fichas_kits ADD COLUMN IF NOT EXISTS valor numeric NOT NULL DEFAULT 0;

-- Recreate the unified view to use kit's own valor
CREATE OR REPLACE VIEW public.vw_fichas_itens_venda AS
SELECT 
  p.id, p.categoria_id, c.nome_categoria, p.nome_produto AS nome_item, p.obs AS observacao, 
  'produto'::text AS tipo_item, NULL::uuid AS produto_principal_id, p.valor, p.ativo, 
  c.exigir_dados_cliente, c.exigir_dados_atendente, p.forma_venda, p.valor_por_kg, 
  p.printer_id, p.created_at, p.updated_at
FROM fichas_produtos p
JOIN fichas_categorias c ON p.categoria_id = c.id
WHERE p.ativo = true AND c.ativo = true
UNION ALL
SELECT 
  k.id, k.categoria_id, c.nome_categoria, k.nome_kit AS nome_item, k.observacao, 
  'kit'::text AS tipo_item, k.produto_principal_id, k.valor, k.ativo, 
  c.exigir_dados_cliente, c.exigir_dados_atendente, 'unitario'::text AS forma_venda, 
  0::numeric AS valor_por_kg, NULL::uuid AS printer_id, k.created_at, k.updated_at
FROM fichas_kits k
JOIN fichas_categorias c ON k.categoria_id = c.id
WHERE k.ativo = true AND c.ativo = true;
