
-- Tabela de caixas
CREATE TABLE public.caixas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL DEFAULT '',
  valor_abertura numeric NOT NULL DEFAULT 0,
  observacao text,
  status text NOT NULL DEFAULT 'aberto',
  total_vendas numeric NOT NULL DEFAULT 0,
  total_sangrias numeric NOT NULL DEFAULT 0,
  aberto_em timestamp with time zone NOT NULL DEFAULT now(),
  fechado_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read caixas" ON public.caixas FOR SELECT USING (true);
CREATE POLICY "Public insert caixas" ON public.caixas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update caixas" ON public.caixas FOR UPDATE USING (true);
CREATE POLICY "Public delete caixas" ON public.caixas FOR DELETE USING (true);

-- Tabela de movimentações do caixa
CREATE TABLE public.caixa_movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id uuid NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'abertura', 'sangria', 'venda', 'fechamento'
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read caixa_movimentacoes" ON public.caixa_movimentacoes FOR SELECT USING (true);
CREATE POLICY "Public insert caixa_movimentacoes" ON public.caixa_movimentacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update caixa_movimentacoes" ON public.caixa_movimentacoes FOR UPDATE USING (true);
CREATE POLICY "Public delete caixa_movimentacoes" ON public.caixa_movimentacoes FOR DELETE USING (true);

-- Função: abrir caixa
CREATE OR REPLACE FUNCTION public.abrir_caixa(
  p_usuario_id uuid,
  p_usuario_nome text,
  p_valor_abertura numeric DEFAULT 0,
  p_observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caixa_id uuid;
  v_existing uuid;
BEGIN
  -- Verificar se já existe caixa aberto para o usuário
  SELECT id INTO v_existing FROM public.caixas
  WHERE usuario_id = p_usuario_id AND status = 'aberto'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um caixa aberto para este usuário';
  END IF;

  INSERT INTO public.caixas (usuario_id, usuario_nome, valor_abertura, observacao, status)
  VALUES (p_usuario_id, p_usuario_nome, p_valor_abertura, p_observacao, 'aberto')
  RETURNING id INTO v_caixa_id;

  -- Registrar movimentação de abertura
  INSERT INTO public.caixa_movimentacoes (caixa_id, tipo, valor, descricao)
  VALUES (v_caixa_id, 'abertura', p_valor_abertura, COALESCE(p_observacao, 'Abertura de caixa'));

  RETURN v_caixa_id;
END;
$$;

-- Função: registrar sangria
CREATE OR REPLACE FUNCTION public.registrar_sangria_caixa(
  p_usuario_id uuid,
  p_valor numeric,
  p_descricao text DEFAULT 'Sangria'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caixa_id uuid;
  v_mov_id uuid;
BEGIN
  SELECT id INTO v_caixa_id FROM public.caixas
  WHERE usuario_id = p_usuario_id AND status = 'aberto'
  LIMIT 1;

  IF v_caixa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum caixa aberto para este usuário';
  END IF;

  -- Atualizar total de sangrias
  UPDATE public.caixas SET total_sangrias = total_sangrias + p_valor WHERE id = v_caixa_id;

  -- Registrar movimentação
  INSERT INTO public.caixa_movimentacoes (caixa_id, tipo, valor, descricao)
  VALUES (v_caixa_id, 'sangria', p_valor, p_descricao)
  RETURNING id INTO v_mov_id;

  RETURN v_mov_id;
END;
$$;

-- Função: fechar caixa
CREATE OR REPLACE FUNCTION public.fechar_caixa(
  p_usuario_id uuid,
  p_observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caixa_id uuid;
BEGIN
  SELECT id INTO v_caixa_id FROM public.caixas
  WHERE usuario_id = p_usuario_id AND status = 'aberto'
  LIMIT 1;

  IF v_caixa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum caixa aberto para este usuário';
  END IF;

  UPDATE public.caixas
  SET status = 'fechado', fechado_em = now()
  WHERE id = v_caixa_id;

  -- Registrar movimentação de fechamento
  INSERT INTO public.caixa_movimentacoes (caixa_id, tipo, valor, descricao)
  VALUES (v_caixa_id, 'fechamento', 0, COALESCE(p_observacao, 'Fechamento de caixa'));

  RETURN v_caixa_id;
END;
$$;
