
CREATE OR REPLACE FUNCTION public.salvar_kit_com_componentes(
  p_kit_id uuid DEFAULT NULL,
  p_nome_kit text DEFAULT '',
  p_categoria_id uuid DEFAULT NULL,
  p_valor numeric DEFAULT 0,
  p_observacao text DEFAULT NULL,
  p_ativo boolean DEFAULT true,
  p_componentes jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_kit_id uuid;
  v_comp jsonb;
BEGIN
  IF p_kit_id IS NOT NULL THEN
    -- Update existing kit
    UPDATE public.fichas_kits
    SET nome_kit = p_nome_kit,
        categoria_id = p_categoria_id,
        valor = p_valor,
        observacao = p_observacao,
        ativo = p_ativo,
        updated_at = now()
    WHERE id = p_kit_id;
    v_kit_id := p_kit_id;
    
    -- Remove old components
    DELETE FROM public.fichas_kit_itens WHERE kit_id = v_kit_id;
  ELSE
    -- Insert new kit
    INSERT INTO public.fichas_kits (nome_kit, categoria_id, valor, observacao, ativo)
    VALUES (p_nome_kit, p_categoria_id, p_valor, p_observacao, p_ativo)
    RETURNING id INTO v_kit_id;
  END IF;
  
  -- Insert components
  FOR v_comp IN SELECT * FROM jsonb_array_elements(p_componentes)
  LOOP
    INSERT INTO public.fichas_kit_itens (kit_id, produto_componente_id, quantidade_baixa)
    VALUES (
      v_kit_id,
      (v_comp->>'produto_componente_id')::uuid,
      (v_comp->>'quantidade_baixa')::integer
    );
  END LOOP;
  
  RETURN v_kit_id;
END;
$$;
