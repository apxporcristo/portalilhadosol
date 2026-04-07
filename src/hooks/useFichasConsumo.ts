import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/hooks/useVouchers';
import { useOptionalEmpresa } from '@/contexts/EmpresaContext';

export interface FichaCategoria {
  id: string;
  nome_categoria: string;
  ativo: boolean;
  exigir_dados_cliente: boolean;
  exigir_dados_atendente: boolean;
  created_at: string;
}

export interface FichaProduto {
  id: string;
  categoria_id: string;
  nome_produto: string;
  valor: number;
  ativo: boolean;
  printer_id: string | null;
  forma_venda: 'unitario' | 'por_peso';
  valor_por_kg: number;
  obs: string | null;
  created_at: string;
}

export interface FichaAtiva {
  id: string;
  nome_produto: string;
  valor: number;
  categoria_id: string;
  categoria_nome: string;
  exigir_dados_cliente: boolean;
  exigir_dados_atendente: boolean;
  forma_venda?: string;
  valor_por_kg?: number;
  printer_id?: string | null;
  obs?: string | null;
  tipo_item?: 'produto' | 'kit';
  created_at: string;
}

export interface FichaImpressao {
  id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  nome_cliente: string | null;
  documento_cliente: string | null;
  telefone_cliente: string | null;
  nome_atendente: string | null;
  codigo_atendente: string | null;
  created_at: string;
}

export function useFichasConsumo() {
  const empresaCtx = useOptionalEmpresa();
  const empresaId = empresaCtx?.empresaId || null;

  const [fichasAtivas, setFichasAtivas] = useState<FichaAtiva[]>([]);
  const [categorias, setCategorias] = useState<FichaCategoria[]>([]);
  const [produtos, setProdutos] = useState<FichaProduto[]>([]);
  const [impressoes, setImpressoes] = useState<FichaImpressao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFichasAtivas = useCallback(async () => {
    const supabase = await getSupabaseClient();
    
    let prodQuery = supabase.from('vw_fichas_ativas' as any).select('*');
    if (empresaId) prodQuery = prodQuery.eq('empresa_id', empresaId);

    let kitQuery = supabase.from('fichas_kits' as any).select('*, fichas_categorias:categoria_id(nome_categoria, exigir_dados_cliente, exigir_dados_atendente)').eq('ativo', true);
    if (empresaId) kitQuery = kitQuery.eq('empresa_id', empresaId);

    const [{ data: prodData }, { data: kitData }] = await Promise.all([prodQuery, kitQuery]);

    const items: any[] = [];

    if (prodData) {
      for (const d of prodData as any[]) {
        items.push({
          ...d,
          nome_produto: d.nome_produto ?? d.nome ?? '',
          categoria_nome: d.categoria_nome ?? d.nome_categoria ?? 'Sem categoria',
          tipo_item: 'produto',
        });
      }
    }

    if (kitData) {
      for (const k of kitData as any[]) {
        const cat = k.fichas_categorias;
        if (!cat) continue;
        items.push({
          id: k.id,
          categoria_id: k.categoria_id,
          nome_produto: k.nome_kit || '',
          categoria_nome: cat.nome_categoria || 'Sem categoria',
          exigir_dados_cliente: cat.exigir_dados_cliente || false,
          exigir_dados_atendente: cat.exigir_dados_atendente || false,
          valor: k.valor || 0,
          tipo_item: 'kit',
          obs: k.observacao || null,
          created_at: k.created_at,
        });
      }
    }

    setFichasAtivas(items as unknown as FichaAtiva[]);
  }, [empresaId]);

  const fetchCategorias = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('fichas_categorias').select('*').order('nome_categoria');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data } = await query;
    if (data) setCategorias(data as unknown as FichaCategoria[]);
  }, [empresaId]);

  const fetchProdutos = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('fichas_produtos').select('*').order('nome_produto');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data } = await query;
    if (data) setProdutos(data as unknown as FichaProduto[]);
  }, [empresaId]);

  const fetchImpressoes = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('fichas_impressoes').select('*').order('id', { ascending: false }).limit(500);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data } = await query;
    if (data) setImpressoes(data as unknown as FichaImpressao[]);
  }, [empresaId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFichasAtivas(), fetchCategorias(), fetchProdutos(), fetchImpressoes()]);
    setLoading(false);
  }, [fetchFichasAtivas, fetchCategorias, fetchProdutos, fetchImpressoes]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Categorias CRUD
  const createCategoria = useCallback(async (nome: string, exigirCliente = false, exigirAtendente = false) => {
    const supabase = await getSupabaseClient();
    const payload: any = { 
      nome_categoria: nome, 
      exigir_dados_cliente: exigirCliente, 
      exigir_dados_atendente: exigirAtendente,
    };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('fichas_categorias').insert(payload);
    if (error) throw error;
    await fetchCategorias();
    await fetchFichasAtivas();
  }, [empresaId, fetchCategorias, fetchFichasAtivas]);

  const updateCategoria = useCallback(async (id: string, data: Partial<FichaCategoria>) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('fichas_categorias').update(data as any).eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await fetchCategorias();
    await fetchFichasAtivas();
  }, [empresaId, fetchCategorias, fetchFichasAtivas]);

  const deleteCategoria = useCallback(async (id: string) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('fichas_categorias').delete().eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await fetchCategorias();
    await fetchProdutos();
    await fetchFichasAtivas();
  }, [empresaId, fetchCategorias, fetchProdutos, fetchFichasAtivas]);

  // Produtos CRUD
  const createProduto = useCallback(async (produto: { categoria_id: string; nome_produto: string; valor: number; printer_id?: string | null }) => {
    const supabase = await getSupabaseClient();
    const payload: any = { ...produto };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('fichas_produtos').insert(payload);
    if (error) throw error;
    await fetchProdutos();
    await fetchFichasAtivas();
  }, [empresaId, fetchProdutos, fetchFichasAtivas]);

  const updateProduto = useCallback(async (id: string, data: Partial<FichaProduto>) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('fichas_produtos').update(data as any).eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await fetchProdutos();
    await fetchFichasAtivas();
  }, [empresaId, fetchProdutos, fetchFichasAtivas]);

  const deleteProduto = useCallback(async (id: string) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('fichas_produtos').delete().eq('id', id);
    if (error) throw error;
    await fetchProdutos();
    await fetchFichasAtivas();
  }, [fetchProdutos, fetchFichasAtivas]);

  // Registrar impressão via RPC with optional client/attendant data
  const registrarImpressao = useCallback(async (
    produtoId: string, 
    quantidade: number, 
    valorUnitario: number,
    dadosExtras?: {
      nome_cliente?: string;
      documento_cliente?: string;
      telefone_cliente?: string;
      nome_atendente?: string;
      codigo_atendente?: string;
    }
  ) => {
    const supabase = await getSupabaseClient();
    const rpcParams: any = {
      p_produto_id: produtoId,
      p_quantidade: quantidade,
      p_valor_unitario: valorUnitario,
      p_nome_cliente: dadosExtras?.nome_cliente || null,
      p_documento_cliente: dadosExtras?.documento_cliente || null,
      p_telefone_cliente: dadosExtras?.telefone_cliente || null,
      p_nome_atendente: dadosExtras?.nome_atendente || null,
      p_codigo_atendente: dadosExtras?.codigo_atendente || null,
    };
    if (empresaId) rpcParams.p_empresa_id = empresaId;
    const { data, error } = await supabase.rpc('registrar_impressao_fichas', rpcParams);
    if (error) throw error;
    await fetchImpressoes();
    return data;
  }, [empresaId, fetchImpressoes]);

  // Verificar senha de cadastro
  const verificarSenha = useCallback(async (senha: string): Promise<boolean> => {
    const supabase = await getSupabaseClient();
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'fichas_cadastro_senha')
      .maybeSingle();
    const senhaCorreta = data?.value || 'Vendas';
    return senha === senhaCorreta;
  }, []);

  // Salvar senha de cadastro
  const salvarSenha = useCallback(async (novaSenha: string) => {
    const supabase = await getSupabaseClient();
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'fichas_cadastro_senha')
      .maybeSingle();

    if (existing) {
      await supabase.from('app_settings').update({ value: novaSenha }).eq('key', 'fichas_cadastro_senha');
    } else {
      await supabase.from('app_settings').insert({ key: 'fichas_cadastro_senha', value: novaSenha });
    }
  }, []);

  return {
    fichasAtivas,
    categorias,
    produtos,
    impressoes,
    loading,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    createProduto,
    updateProduto,
    deleteProduto,
    registrarImpressao,
    verificarSenha,
    salvarSenha,
    refetch: loadAll,
  };
}
