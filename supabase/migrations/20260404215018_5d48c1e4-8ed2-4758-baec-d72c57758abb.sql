
-- Add estoque_negativo column to fichas_produtos
ALTER TABLE public.fichas_produtos ADD COLUMN IF NOT EXISTS estoque_negativo boolean NOT NULL DEFAULT false;

-- Create entradas_mercadoria table (purchase note header)
CREATE TABLE public.entradas_mercadoria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_nota text NOT NULL,
  data_compra date NOT NULL,
  observacao text,
  usuario_id uuid,
  usuario_nome text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.entradas_mercadoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read entradas_mercadoria" ON public.entradas_mercadoria FOR SELECT USING (true);
CREATE POLICY "Public insert entradas_mercadoria" ON public.entradas_mercadoria FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update entradas_mercadoria" ON public.entradas_mercadoria FOR UPDATE USING (true);
CREATE POLICY "Public delete entradas_mercadoria" ON public.entradas_mercadoria FOR DELETE USING (true);

-- Create entradas_mercadoria_itens table (purchase note items)
CREATE TABLE public.entradas_mercadoria_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entrada_id uuid NOT NULL REFERENCES public.entradas_mercadoria(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL,
  produto_nome text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  valor_comprado numeric NOT NULL DEFAULT 0,
  margem_lucro numeric NOT NULL DEFAULT 1,
  valor_venda numeric NOT NULL DEFAULT 0,
  valor_total_comprado numeric NOT NULL DEFAULT 0,
  valor_total_venda numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.entradas_mercadoria_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read entradas_mercadoria_itens" ON public.entradas_mercadoria_itens FOR SELECT USING (true);
CREATE POLICY "Public insert entradas_mercadoria_itens" ON public.entradas_mercadoria_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update entradas_mercadoria_itens" ON public.entradas_mercadoria_itens FOR UPDATE USING (true);
CREATE POLICY "Public delete entradas_mercadoria_itens" ON public.entradas_mercadoria_itens FOR DELETE USING (true);

-- Create stock view
CREATE OR REPLACE VIEW public.vw_estoque AS
SELECT
  fp.id AS produto_id,
  fp.nome_produto,
  fp.categoria_id,
  fc.nome_categoria,
  fp.ativo,
  fp.estoque_negativo,
  fp.valor AS valor_venda_atual,
  COALESCE(ent.total_comprado, 0) AS quantidade_comprada,
  COALESCE(vendas.total_vendido, 0) AS quantidade_vendida,
  COALESCE(ent.total_comprado, 0) - COALESCE(vendas.total_vendido, 0) AS estoque_atual,
  ent.ultimo_valor_comprado,
  ent.ultimo_valor_venda
FROM public.fichas_produtos fp
LEFT JOIN public.fichas_categorias fc ON fc.id = fp.categoria_id
LEFT JOIN LATERAL (
  SELECT
    SUM(ei.quantidade) AS total_comprado,
    (ARRAY_AGG(ei.valor_comprado ORDER BY em.data_compra DESC, ei.created_at DESC))[1] AS ultimo_valor_comprado,
    (ARRAY_AGG(ei.valor_venda ORDER BY em.data_compra DESC, ei.created_at DESC))[1] AS ultimo_valor_venda
  FROM public.entradas_mercadoria_itens ei
  JOIN public.entradas_mercadoria em ON em.id = ei.entrada_id
  WHERE ei.produto_id = fp.id
) ent ON true
LEFT JOIN LATERAL (
  SELECT SUM(fi.quantidade) AS total_vendido
  FROM public.fichas_impressas fi
  WHERE fi.produto_id = fp.id
) vendas ON true
WHERE fp.ativo = true;
