import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, getAuthClient } from '@/lib/supabase-external';
import { toast } from '@/hooks/use-toast';
import { useOptionalEmpresa } from '@/contexts/EmpresaContext';

export interface Comanda {
  id: string;
  numero: number;
  status: 'livre' | 'aberta' | 'fechada';
  nome_cliente: string | null;
  telefone_cliente: string | null;
  observacao: string | null;
  ativo: boolean;
  aberta_em: string | null;
  fechada_em: string | null;
  fechada_por: string | null;
  forma_pagamento_id: string | null;
  forma_pagamento_nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComandaItem {
  id: string;
  comanda_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  peso: number | null;
  complementos: any[] | null;
  observacao: string | null;
  printer_id: string | null;
  impresso: boolean;
  created_at: string;
}

export interface ComandaAlteracao {
  id: string;
  comanda_id: string;
  item_id: string | null;
  tipo: 'edicao' | 'exclusao';
  descricao: string;
  usuario_email: string;
  usuario_nome: string | null;
  created_at: string;
}

export function useComandas() {
  const empresaCtx = useOptionalEmpresa();
  const empresaId = empresaCtx?.empresaId || null;

  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComandas = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient();
      let query = supabase.from('comandas' as any).select('*').eq('ativo', true).order('numero');
      if (empresaId) query = query.eq('empresa_id', empresaId);
      const { data } = await query;
      if (data) setComandas(data as unknown as Comanda[]);
    } catch { /* table may not exist */ }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchComandas(); }, [fetchComandas]);

  const comandasAbertas = comandas.filter(c => c.status === 'aberta');
  const comandasLivres = comandas.filter(c => c.status === 'livre');

  const createComanda = useCallback(async (numero: number, observacao?: string) => {
    const supabase = await getSupabaseClient();
    const payload: any = { numero, observacao: observacao || null };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('comandas' as any).insert(payload);
    if (error) throw error;
    await fetchComandas();
  }, [empresaId, fetchComandas]);

  const updateComanda = useCallback(async (id: string, data: Partial<Comanda>) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('comandas' as any).update({ ...data, updated_at: new Date().toISOString() } as any).eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await fetchComandas();
  }, [empresaId, fetchComandas]);

  const deleteComanda = useCallback(async (id: string) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('comandas' as any).delete().eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await fetchComandas();
  }, [empresaId, fetchComandas]);

  const abrirComanda = useCallback(async (id: string, nomeCliente: string, telefoneCliente?: string) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('comandas' as any).update({
      status: 'aberta',
      nome_cliente: nomeCliente,
      telefone_cliente: telefoneCliente || null,
      aberta_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await fetchComandas();
  }, [empresaId, fetchComandas]);

  const fecharComanda = useCallback(async (
    id: string,
    formaPagamentoId: string,
    formaPagamentoNome: string,
    usuarioEmail: string,
    usuarioNome?: string,
    usuarioId?: string
  ) => {
    const supabase = await getSupabaseClient();
    // 1. Mark as fechada
    let closeQuery = supabase.from('comandas' as any).update({
      status: 'fechada',
      fechada_em: new Date().toISOString(),
      fechada_por: usuarioId || null,
      forma_pagamento_id: formaPagamentoId,
      forma_pagamento_nome: formaPagamentoNome,
      updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (empresaId) closeQuery = closeQuery.eq('empresa_id', empresaId);
    const { error } = await closeQuery;
    if (error) throw error;

    // 2. Log the closing
    const logPayload: any = {
      comanda_id: id,
      tipo: 'edicao',
      descricao: `Comanda fechada - Forma: ${formaPagamentoNome} - Fechada por: ${usuarioNome || usuarioEmail}`,
      usuario_email: usuarioEmail,
      usuario_nome: usuarioNome || null,
    };
    if (empresaId) logPayload.empresa_id = empresaId;
    await supabase.from('comanda_alteracoes' as any).insert(logPayload as any);

    // 3. Reset comanda to 'livre' for reuse (clear client data but keep history in comanda_alteracoes)
    let resetQuery = supabase.from('comandas' as any).update({
      status: 'livre',
      nome_cliente: null,
      telefone_cliente: null,
      observacao: null,
      aberta_em: null,
      fechada_em: null,
      fechada_por: null,
      forma_pagamento_id: null,
      forma_pagamento_nome: null,
      updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (empresaId) resetQuery = resetQuery.eq('empresa_id', empresaId);
    const { error: resetError } = await resetQuery;
    if (resetError) throw resetError;

    await fetchComandas();
  }, [empresaId, fetchComandas]);

  const getItensComanda = useCallback(async (comandaId: string): Promise<ComandaItem[]> => {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.from('comanda_itens' as any).select('*').eq('comanda_id', comandaId).order('created_at');
    return ((data as any[]) || []).map((d: any) => ({
      ...d,
      complementos: d.complementos_json ? (typeof d.complementos_json === 'string' ? JSON.parse(d.complementos_json) : d.complementos_json) : null,
    })) as ComandaItem[];
  }, []);

  const lancarItens = useCallback(async (comandaId: string, items: {
    produto_id: string;
    produto_nome: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    peso?: number | null;
    complementos?: any[] | null;
    observacao?: string | null;
    printer_id?: string | null;
  }[], usuarioLogin?: string) => {
    const supabase = await getSupabaseClient();

    // Use custom auth login (CPF-based) — Supabase Auth is not used in this project
    const login = usuarioLogin || 'sistema';
    console.log('[lancarItens] Usuário:', { login });

    for (const item of items) {
      // Use numeric quantity (not integer) and jsonb complementos to match the correct overload
      const complementos = item.complementos && item.complementos.length > 0 
        ? item.complementos 
        : [];
      
      const payload = {
        p_comanda_id: comandaId,
        p_produto_id: item.produto_id,
        p_descricao_produto: item.produto_nome,
        p_quantidade: Number(item.quantidade) + 0.0, // force numeric
        p_valor_unitario: Number(item.valor_unitario),
        p_subtotal: Number(item.valor_total),
        p_origem: 'ficha',
        p_observacao: item.observacao || '',
        p_possui_complementos: !!(item.complementos && item.complementos.length > 0),
        p_complementos_json: JSON.stringify(complementos),
        p_produto_nome: item.produto_nome,
        p_valor_total: Number(item.valor_total),
        p_usuario_login: login,
      };

      console.log('[lancarItens] Payload RPC lancar_item_comanda:', payload);

      // Use direct fetch to specify Content-Profile and resolve overloaded function
      const sbUrl = (supabase as any).supabaseUrl || (supabase as any).restUrl?.replace('/rest/v1', '');
      const sbKey = (supabase as any).supabaseKey;
      
      let rpcUrl: string;
      let rpcKey: string;
      
      if (sbUrl && sbKey) {
        rpcUrl = `${sbUrl}/rest/v1/rpc/lancar_item_comanda`;
        rpcKey = sbKey;
      } else {
        // Fallback: try standard rpc
        const { error } = await supabase.rpc('lancar_item_comanda' as any, payload as any);
        if (error) {
          console.error('[lancarItens] Erro RPC lancar_item_comanda:', error);
          throw new Error(`Erro ao lançar item "${item.produto_nome}": ${error.message}`);
        }
        console.log('[lancarItens] Item lançado com sucesso:', item.produto_nome);
        continue;
      }
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': rpcKey,
          'Authorization': `Bearer ${rpcKey}`,
          'Content-Profile': 'public',
          'Prefer': 'params=single-object',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error('[lancarItens] Erro RPC lancar_item_comanda:', errBody);
        throw new Error(`Erro ao lançar item "${item.produto_nome}": ${errBody.message || response.statusText}`);
      }

      console.log('[lancarItens] Item lançado com sucesso:', item.produto_nome);
    }
  }, []);

  const editarItem = useCallback(async (itemId: string, dados: Partial<ComandaItem>) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('comanda_itens' as any).update(dados as any).eq('id', itemId);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
  }, [empresaId]);

  const excluirItem = useCallback(async (itemId: string) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('comanda_itens' as any).delete().eq('id', itemId);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
  }, [empresaId]);

  const registrarAlteracao = useCallback(async (
    comandaId: string,
    itemId: string | null,
    tipo: 'edicao' | 'exclusao',
    descricao: string,
    usuarioEmail: string,
    usuarioNome?: string
  ) => {
    const supabase = await getSupabaseClient();
    const payload: any = {
      comanda_id: comandaId,
      item_id: itemId,
      tipo,
      descricao,
      usuario_email: usuarioEmail,
      usuario_nome: usuarioNome || null,
    };
    if (empresaId) payload.empresa_id = empresaId;
    await supabase.from('comanda_alteracoes' as any).insert(payload as any);
  }, [empresaId]);

  const autenticarUsuario = useCallback(async (cpf: string, senha: string): Promise<{ success: boolean; nome?: string; email?: string }> => {
    try {
      // Lookup email by CPF
      const supabase = await getSupabaseClient();
      const { data: profile } = await supabase.from('user_profiles' as any).select('email, nome').eq('cpf', cpf).maybeSingle();
      if (!profile || !(profile as any).email) return { success: false };

      const email = (profile as any).email;
      const auth = await getAuthClient();
      const { data, error } = await auth.auth.signInWithPassword({ email, password: senha });
      if (error || !data.user) return { success: false };

      return { success: true, nome: (profile as any)?.nome || email, email };
    } catch {
      return { success: false };
    }
  }, []);

  const getAlteracoes = useCallback(async (comandaId: string): Promise<ComandaAlteracao[]> => {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.from('comanda_alteracoes' as any).select('*').eq('comanda_id', comandaId).order('created_at', { ascending: false });
    return (data as unknown as ComandaAlteracao[]) || [];
  }, []);

  return {
    comandas,
    comandasAbertas,
    comandasLivres,
    loading,
    createComanda,
    updateComanda,
    deleteComanda,
    abrirComanda,
    fecharComanda,
    getItensComanda,
    lancarItens,
    editarItem,
    excluirItem,
    registrarAlteracao,
    autenticarUsuario,
    getAlteracoes,
    refetch: fetchComandas,
  };
}
