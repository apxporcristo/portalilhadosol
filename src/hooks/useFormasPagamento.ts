import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/hooks/useVouchers';
import { toast } from '@/hooks/use-toast';
import { useOptionalEmpresa } from '@/contexts/EmpresaContext';

export interface FormaPagamento {
  id: string;
  nome: string;
  ativo: boolean;
  exibir_troco: boolean;
  created_at: string;
  updated_at: string;
}

export function useFormasPagamento() {
  const empresaCtx = useOptionalEmpresa();
  const empresaId = empresaCtx?.empresaId || null;

  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFormas = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('formas_pagamento' as any).select('*').order('nome');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data, error } = await query;
    if (!error && data) {
      setFormas(data as unknown as FormaPagamento[]);
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchFormas(); }, [fetchFormas]);

  const createForma = useCallback(async (forma: { nome: string; ativo?: boolean; exibir_troco?: boolean }) => {
    const supabase = await getSupabaseClient();
    const payload: any = { ...forma };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('formas_pagamento' as any).insert(payload);
    if (error) {
      toast({ title: 'Erro', description: `Não foi possível criar: ${error.message}`, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Forma de pagamento criada' });
    await fetchFormas();
    return true;
  }, [empresaId, fetchFormas]);

  const updateForma = useCallback(async (id: string, data: Partial<FormaPagamento>) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('formas_pagamento' as any).update(data as any).eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) {
      toast({ title: 'Erro', description: `Não foi possível atualizar: ${error.message}`, variant: 'destructive' });
      return false;
    }
    await fetchFormas();
    return true;
  }, [empresaId, fetchFormas]);

  const deleteForma = useCallback(async (id: string) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('formas_pagamento' as any).delete().eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) {
      toast({ title: 'Erro', description: `Não foi possível excluir: ${error.message}`, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Forma de pagamento excluída' });
    await fetchFormas();
    return true;
  }, [empresaId, fetchFormas]);

  const formasAtivas = formas.filter(f => f.ativo);

  return { formas, formasAtivas, loading, createForma, updateForma, deleteForma, refetch: fetchFormas };
}
