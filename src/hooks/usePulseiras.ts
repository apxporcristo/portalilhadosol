import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-external';
import { toast } from '@/hooks/use-toast';
import { useOptionalEmpresa } from '@/contexts/EmpresaContext';

/* ── Types ── */

export interface PulseiraResumo {
  id: string;
  numero: string;
  nome_cliente: string;
  telefone: string | null;
  cpf: string | null;
  status: string;
  aberta_em: string;
  fechada_em: string | null;
  total_comprado: number;
  total_consumido: number;
  total_baixado: number;
  total_abatido: number;
  total_disponivel: number;
  quantidade_itens: number;
  quantidade_disponivel: number;
  pode_fechar: boolean;
  pode_reabrir: boolean;
}

export interface PulseiraSaldo {
  pulseira_id: string;
  produto_id: string | null;
  produto_nome: string;
  quantidade_comprada: number;
  quantidade_consumida: number;
  quantidade_baixada: number;
  quantidade_disponivel: number;
  valor_comprado: number;
  valor_consumido: number;
  valor_baixado: number;
  valor_disponivel: number;
}

export interface PulseiraHistorico {
  data_evento: string;
  tipo_evento: string;
  descricao_evento: string;
  usuario_nome: string | null;
  valor: number;
  quantidade: number;
  referencia_id: string | null;
}

/* ── Hook ── */

export function usePulseiras() {
  const empresaCtx = useOptionalEmpresa();
  const empresaId = empresaCtx?.empresaId || null;
  const [loading, setLoading] = useState(false);
  const [pulseirasAbertas, setPulseirasAbertas] = useState<PulseiraResumo[]>([]);
  const [pulseirasFechadas, setPulseirasFechadas] = useState<PulseiraResumo[]>([]);
  const [detalhe, setDetalhe] = useState<PulseiraResumo | null>(null);
  const [saldos, setSaldos] = useState<PulseiraSaldo[]>([]);
  const [historico, setHistorico] = useState<PulseiraHistorico[]>([]);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [saldoError, setSaldoError] = useState<string | null>(null);
  const [historicoError, setHistoricoError] = useState<string | null>(null);

  /* ── Listar ── */

  const listarAbertas = useCallback(async () => {
    try {
      const db = await getSupabaseClient();
      const { data, error } = await db
        .from('vw_pulseiras_resumo' as any)
        .select('*')
        .eq('status', 'ativa')
        .order('aberta_em', { ascending: false });
      if (error) throw error;
      setPulseirasAbertas((data || []) as PulseiraResumo[]);
    } catch (err: any) {
      console.warn('[Pulseiras] Erro listar abertas:', err.message);
    }
  }, []);

  const listarFechadas = useCallback(async () => {
    try {
      const db = await getSupabaseClient();
      const { data, error } = await db
        .from('vw_pulseiras_resumo' as any)
        .select('*')
        .eq('status', 'fechada')
        .order('fechada_em', { ascending: false });
      if (error) throw error;
      setPulseirasFechadas((data || []) as PulseiraResumo[]);
    } catch (err: any) {
      console.warn('[Pulseiras] Erro listar fechadas:', err.message);
    }
  }, []);

  /* ── Detalhe ── */

  const carregarDetalhe = useCallback(async (pulseiraId: string) => {
    setLoading(true);
    setSaldoError(null);
    setHistoricoError(null);
    try {
      const db = await getSupabaseClient();
      // Resumo
      const { data, error } = await db
        .from('vw_pulseiras_resumo' as any)
        .select('*')
        .eq('id', pulseiraId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({ title: 'Pulseira não encontrada', variant: 'destructive' });
        setDetalhe(null);
        setLoading(false);
        return;
      }
      setDetalhe(data as PulseiraResumo);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar pulseira', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }

    // Saldo e histórico em paralelo, isolados
    carregarSaldos(pulseiraId);
    carregarHistorico(pulseiraId);
  }, []);

  const carregarSaldos = useCallback(async (pulseiraId: string) => {
    setSaldoLoading(true);
    setSaldoError(null);
    try {
      const db = await getSupabaseClient();
      const { data, error } = await db
        .from('vw_pulseira_saldos' as any)
        .select('*')
        .eq('pulseira_id', pulseiraId);
      if (error) throw error;
      setSaldos((data || []) as PulseiraSaldo[]);
    } catch (err: any) {
      console.warn('[Pulseiras] Erro saldos:', err.message);
      setSaldoError('Não foi possível carregar o saldo por produto.');
      setSaldos([]);
    } finally {
      setSaldoLoading(false);
    }
  }, []);

  const carregarHistorico = useCallback(async (pulseiraId: string) => {
    setHistoricoLoading(true);
    setHistoricoError(null);
    try {
      const db = await getSupabaseClient();
      const { data, error } = await db
        .from('vw_pulseira_historico' as any)
        .select('*')
        .eq('pulseira_id', pulseiraId)
        .order('data_evento', { ascending: false });
      if (error) throw error;
      setHistorico((data || []) as PulseiraHistorico[]);
    } catch (err: any) {
      console.warn('[Pulseiras] Erro histórico:', err.message);
      setHistoricoError('Não foi possível carregar o histórico.');
      setHistorico([]);
    } finally {
      setHistoricoLoading(false);
    }
  }, []);

  const limpar = useCallback(() => {
    setDetalhe(null);
    setSaldos([]);
    setHistorico([]);
    setSaldoError(null);
    setHistoricoError(null);
  }, []);

  /* ── Ações via RPC ── */

  const abrirPulseira = useCallback(async (params: { numero: string; nome_cliente: string; telefone?: string; cpf?: string; aberta_por?: string; aberta_por_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { data, error } = await db.rpc('abrir_pulseira' as any, {
        p_numero: params.numero,
        p_nome_cliente: params.nome_cliente,
        p_telefone: params.telefone || null,
        p_cpf: params.cpf || null,
        p_aberta_por: params.aberta_por || null,
        p_aberta_por_nome: params.aberta_por_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Pulseira aberta com sucesso!' });
      listarAbertas();
      return data;
    } catch (err: any) {
      toast({ title: 'Erro ao abrir pulseira', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [listarAbertas]);

  const registrarItem = useCallback(async (pulseiraId: string, params: { produto_id?: string; produto_nome: string; quantidade: number; valor_unitario: number; observacao?: string; usuario_id?: string; usuario_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.rpc('registrar_item_pulseira' as any, {
        p_pulseira_id: pulseiraId,
        p_produto_id: params.produto_id || null,
        p_produto_nome: params.produto_nome,
        p_quantidade: params.quantidade,
        p_valor_unitario: params.valor_unitario,
        p_observacao: params.observacao || null,
        p_usuario_id: params.usuario_id || null,
        p_usuario_nome: params.usuario_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Item adicionado!' });
      carregarDetalhe(pulseiraId);
      listarAbertas();
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar item', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [carregarDetalhe, listarAbertas]);

  const registrarConsumo = useCallback(async (pulseiraId: string, params: { produto_id?: string; produto_nome: string; quantidade: number; valor_unitario?: number; observacao?: string; usuario_id?: string; usuario_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.rpc('registrar_consumo_pulseira' as any, {
        p_pulseira_id: pulseiraId,
        p_produto_id: params.produto_id || null,
        p_produto_nome: params.produto_nome,
        p_quantidade: params.quantidade,
        p_valor_unitario: params.valor_unitario ?? 0,
        p_observacao: params.observacao || null,
        p_usuario_id: params.usuario_id || null,
        p_usuario_nome: params.usuario_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Consumo registrado!' });
      carregarDetalhe(pulseiraId);
      listarAbertas();
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao registrar consumo', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [carregarDetalhe, listarAbertas]);

  const registrarBaixa = useCallback(async (pulseiraId: string, params: { produto_id?: string; produto_nome: string; quantidade: number; valor_unitario?: number; motivo?: string; usuario_id?: string; usuario_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.rpc('registrar_baixa_pulseira' as any, {
        p_pulseira_id: pulseiraId,
        p_produto_id: params.produto_id || null,
        p_produto_nome: params.produto_nome,
        p_quantidade: params.quantidade,
        p_valor_unitario: params.valor_unitario ?? 0,
        p_motivo: params.motivo || null,
        p_usuario_id: params.usuario_id || null,
        p_usuario_nome: params.usuario_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Baixa registrada!' });
      carregarDetalhe(pulseiraId);
      listarAbertas();
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao registrar baixa', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [carregarDetalhe, listarAbertas]);

  const registrarAbateCredito = useCallback(async (pulseiraId: string, params: { valor: number; descricao?: string; usuario_id?: string; usuario_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.rpc('registrar_abate_credito_pulseira' as any, {
        p_pulseira_id: pulseiraId,
        p_valor: params.valor,
        p_descricao: params.descricao || null,
        p_usuario_id: params.usuario_id || null,
        p_usuario_nome: params.usuario_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Abate de crédito registrado!' });
      carregarDetalhe(pulseiraId);
      listarAbertas();
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao registrar abate', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [carregarDetalhe, listarAbertas]);

  const fecharPulseira = useCallback(async (pulseiraId: string, params?: { fechada_por?: string; fechada_por_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.rpc('fechar_pulseira' as any, {
        p_pulseira_id: pulseiraId,
        p_fechada_por: params?.fechada_por || null,
        p_fechada_por_nome: params?.fechada_por_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Pulseira fechada com sucesso!' });
      limpar();
      listarAbertas();
      listarFechadas();
      return true;
    } catch (err: any) {
      toast({ title: 'Não foi possível fechar a pulseira', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [limpar, listarAbertas, listarFechadas]);

  const reabrirPulseira = useCallback(async (pulseiraId: string, params?: { reaberta_por?: string; reaberta_por_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.rpc('reabrir_pulseira' as any, {
        p_pulseira_id: pulseiraId,
        p_reaberta_por: params?.reaberta_por || null,
        p_reaberta_por_nome: params?.reaberta_por_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Pulseira reaberta!' });
      limpar();
      listarAbertas();
      listarFechadas();
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao reabrir pulseira', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [limpar, listarAbertas, listarFechadas]);

  const excluirPulseira = useCallback(async (pulseiraId: string, params?: { usuario_id?: string; usuario_nome?: string }) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.rpc('excluir_pulseira_completa' as any, {
        p_pulseira_id: pulseiraId,
        p_usuario_id: params?.usuario_id || null,
        p_usuario_nome: params?.usuario_nome || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Pulseira excluída!' });
      limpar();
      listarAbertas();
      listarFechadas();
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao excluir pulseira', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [limpar, listarAbertas, listarFechadas]);

  return {
    loading,
    pulseirasAbertas,
    pulseirasFechadas,
    detalhe,
    saldos,
    historico,
    saldoLoading,
    historicoLoading,
    saldoError,
    historicoError,
    listarAbertas,
    listarFechadas,
    carregarDetalhe,
    limpar,
    abrirPulseira,
    registrarItem,
    registrarConsumo,
    registrarBaixa,
    registrarAbateCredito,
    fecharPulseira,
    reabrirPulseira,
    excluirPulseira,
  };
}
