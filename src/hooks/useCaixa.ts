import { useState, useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-external';
import { useOptionalUserSession } from '@/contexts/UserSessionContext';
import { useOptionalEmpresa } from '@/contexts/EmpresaContext';

export interface Caixa {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  valor_abertura: number;
  observacao: string | null;
  status: string;
  total_vendas: number;
  total_sangrias: number;
  aberto_em: string;
  fechado_em: string | null;
}

export interface CaixaMovimentacao {
  id: string;
  caixa_id: string;
  tipo: string;
  valor: number;
  descricao: string | null;
  created_at: string;
}

export interface VendaDia {
  id: string;
  codigo_venda: string;
  data_venda: string;
  produto_nome: string;
  categoria_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  nome_cliente: string | null;
  nome_atendente: string | null;
  origem_venda: string;
  comanda_numero: string | null;
  pulseira_numero: string | null;
}

export function useCaixa() {
  const userSession = useOptionalUserSession();
  const empresaCtx = useOptionalEmpresa();
  const empresaId = empresaCtx?.empresaId || null;
  const userId = userSession?.user?.id;
  const userName = userSession?.access?.nome || '';

  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([]);
  const [vendasDia, setVendasDia] = useState<VendaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVendas, setLoadingVendas] = useState(false);

  const carregarCaixaAberto = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const db = await getSupabaseClient();
      let query = db
        .from('caixas')
        .select('*')
        .eq('usuario_id', userId)
        .eq('status', 'aberto')
        .limit(1);
      if (empresaId) query = query.eq('empresa_id', empresaId);
      const { data, error } = await query.maybeSingle();

      if (error) console.error('[Caixa] Erro ao carregar:', error);
      setCaixaAberto(data as Caixa | null);

      if (data) {
        await carregarMovimentacoes(data.id);
      } else {
        setMovimentacoes([]);
      }
    } catch (err) {
      console.error('[Caixa] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, empresaId]);

  const carregarMovimentacoes = useCallback(async (caixaId: string) => {
    try {
      const db = await getSupabaseClient();
      const { data, error } = await db
        .from('caixa_movimentacoes')
        .select('*')
        .eq('caixa_id', caixaId)
        .order('created_at', { ascending: true });

      if (error) console.error('[Caixa] Erro movimentações:', error);
      setMovimentacoes((data as CaixaMovimentacao[]) || []);
    } catch (err) {
      console.error('[Caixa] Erro:', err);
    }
  }, []);

  const carregarVendasDia = useCallback(async () => {
    if (!userId) return;
    setLoadingVendas(true);
    try {
      const db = await getSupabaseClient();
      const hoje = new Date().toISOString().split('T')[0];

      const { data, error } = await db
        .from('vw_reimpressao_vendas')
        .select('*')
        .gte('data_venda', `${hoje}T00:00:00`)
        .lte('data_venda', `${hoje}T23:59:59`);

      if (error) {
        console.error('[Caixa] Erro vendas:', error);
        setVendasDia([]);
        return;
      }

      // Filter vendas by user (nome_atendente matches userName)
      const vendas = ((data as any[]) || []).map(v => ({
        id: v.id || '',
        codigo_venda: v.codigo_venda || '',
        data_venda: v.data_venda || '',
        produto_nome: v.produto_nome || '',
        categoria_nome: v.categoria_nome || '',
        quantidade: v.quantidade || 0,
        valor_unitario: v.valor_unitario || 0,
        valor_total: v.valor_total || 0,
        nome_cliente: v.nome_cliente,
        nome_atendente: v.nome_atendente,
        origem_venda: v.origem_venda || 'venda_unica',
        comanda_numero: v.comanda_numero,
        pulseira_numero: v.pulseira_numero,
      }));

      setVendasDia(vendas);
    } catch (err) {
      console.error('[Caixa] Erro:', err);
    } finally {
      setLoadingVendas(false);
    }
  }, [userId]);

  const abrirCaixa = useCallback(async (valorAbertura: number, observacao?: string) => {
    if (!userId) throw new Error('Usuário não logado');
    const db = await getSupabaseClient();
    const { data, error } = await db.rpc('abrir_caixa', {
      p_usuario_id: userId,
      p_usuario_nome: userName,
      p_valor_abertura: valorAbertura,
      p_observacao: observacao || null,
    });
    if (error) throw error;
    await carregarCaixaAberto();
    await carregarVendasDia();
    return data;
  }, [userId, userName, carregarCaixaAberto, carregarVendasDia]);

  const registrarSangria = useCallback(async (valor: number, descricao?: string) => {
    if (!userId) throw new Error('Usuário não logado');
    const db = await getSupabaseClient();
    const { data, error } = await db.rpc('registrar_sangria_caixa', {
      p_usuario_id: userId,
      p_valor: valor,
      p_descricao: descricao || 'Sangria',
    });
    if (error) throw error;
    await carregarCaixaAberto();
    return data;
  }, [userId, carregarCaixaAberto]);

  const fecharCaixa = useCallback(async (observacao?: string) => {
    if (!userId) throw new Error('Usuário não logado');
    const db = await getSupabaseClient();
    const { data, error } = await db.rpc('fechar_caixa', {
      p_usuario_id: userId,
      p_observacao: observacao || null,
    });
    if (error) throw error;
    await carregarCaixaAberto();
    return data;
  }, [userId, carregarCaixaAberto]);

  // Calcular total vendido das vendas do dia
  const totalVendidoDia = vendasDia.reduce((sum, v) => sum + (v.valor_total || 0), 0);

  useEffect(() => {
    carregarCaixaAberto();
    carregarVendasDia();
  }, [carregarCaixaAberto, carregarVendasDia]);

  return {
    caixaAberto,
    movimentacoes,
    vendasDia,
    loading,
    loadingVendas,
    totalVendidoDia,
    abrirCaixa,
    registrarSangria,
    fecharCaixa,
    recarregar: () => { carregarCaixaAberto(); carregarVendasDia(); },
  };
}
