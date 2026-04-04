
-- Create kits table
CREATE TABLE public.fichas_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_principal_id UUID NOT NULL,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fichas_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read fichas_kits" ON public.fichas_kits FOR SELECT USING (true);
CREATE POLICY "Public insert fichas_kits" ON public.fichas_kits FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update fichas_kits" ON public.fichas_kits FOR UPDATE USING (true);
CREATE POLICY "Public delete fichas_kits" ON public.fichas_kits FOR DELETE USING (true);

-- Create kit items table
CREATE TABLE public.fichas_kit_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL REFERENCES public.fichas_kits(id) ON DELETE CASCADE,
  produto_componente_id UUID NOT NULL,
  quantidade_baixa INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fichas_kit_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read fichas_kit_itens" ON public.fichas_kit_itens FOR SELECT USING (true);
CREATE POLICY "Public insert fichas_kit_itens" ON public.fichas_kit_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update fichas_kit_itens" ON public.fichas_kit_itens FOR UPDATE USING (true);
CREATE POLICY "Public delete fichas_kit_itens" ON public.fichas_kit_itens FOR DELETE USING (true);

-- Unique constraint: one component per kit
ALTER TABLE public.fichas_kit_itens ADD CONSTRAINT uq_kit_componente UNIQUE (kit_id, produto_componente_id);

-- Recreate vw_estoque to include kit component consumption
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
  COALESCE(v.total_vendido_direto, 0) AS quantidade_vendida_direta,
  COALESCE(k.total_consumido_kit, 0) AS quantidade_consumida_kit,
  COALESCE(v.total_vendido_direto, 0) + COALESCE(k.total_consumido_kit, 0) AS quantidade_vendida,
  COALESCE(e.total_comprado, 0) - COALESCE(v.total_vendido_direto, 0) - COALESCE(k.total_consumido_kit, 0) AS estoque_atual,
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
    SUM(fi.quantidade) AS total_vendido_direto,
    (array_agg(fi.valor_unitario ORDER BY fi.created_at DESC))[1] AS ultimo_valor_venda
  FROM public.fichas_impressoes fi
  GROUP BY fi.produto_id
) v ON v.produto_id = p.id
LEFT JOIN (
  SELECT
    ki.produto_componente_id AS produto_id,
    SUM(fi.quantidade * ki.quantidade_baixa) AS total_consumido_kit
  FROM public.fichas_kit_itens ki
  JOIN public.fichas_kits fk ON fk.id = ki.kit_id AND fk.ativo = true
  JOIN public.fichas_impressoes fi ON fi.produto_id = fk.produto_principal_id
  GROUP BY ki.produto_componente_id
) k ON k.produto_id = p.id;

-- Trigger for updated_at on fichas_kits
CREATE TRIGGER update_fichas_kits_updated_at
  BEFORE UPDATE ON public.fichas_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fichas_updated_at();
