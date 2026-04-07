import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/hooks/useVouchers';
import { useOptionalEmpresa } from '@/contexts/EmpresaContext';

export interface Complemento {
  id: string;
  nome: string;
  valor: number;
  ativo: boolean;
  created_at: string;
}

export interface ComplementoItem {
  id: string;
  categoria_id: string;
  nome: string;
  valor: number;
  ativo: boolean;
  grupo_id: string | null;
  escolha_exclusiva: boolean;
  created_at: string;
}

export interface GrupoComplemento {
  id: string;
  categoria_id: string;
  nome_grupo: string;
  tipo_selecao: 'single' | 'multi';
  min_escolhas: number;
  max_escolhas: number | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProdutoComplemento {
  id: string;
  produto_id: string;
  categoria_id: string;
  ordem: number;
  created_at: string;
}

export function useComplementos() {
  const empresaCtx = useOptionalEmpresa();
  const empresaId = empresaCtx?.empresaId || null;

  const [complementos, setComplementos] = useState<Complemento[]>([]);
  const [items, setItems] = useState<ComplementoItem[]>([]);
  const [grupos, setGrupos] = useState<GrupoComplemento[]>([]);
  const [produtoComplementos, setProdutoComplementos] = useState<ProdutoComplemento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComplementos = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('complemento_categorias' as any).select('*').order('nome');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data } = await query;
    if (data) setComplementos(data as any);
  }, [empresaId]);

  const fetchItems = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('complemento_itens' as any).select('*').order('nome');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data } = await query;
    if (data) setItems(data as any);
  }, [empresaId]);

  const fetchGrupos = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('complemento_grupos' as any).select('*').order('ordem');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data } = await query;
    if (data) setGrupos(data as any);
  }, [empresaId]);

  const fetchProdutoComplementos = useCallback(async () => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('produto_complemento_categorias' as any).select('*').order('ordem');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data } = await query;
    if (data) setProdutoComplementos(data as any);
  }, [empresaId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchComplementos(), fetchItems(), fetchGrupos(), fetchProdutoComplementos()]);
    setLoading(false);
  }, [fetchComplementos, fetchItems, fetchGrupos, fetchProdutoComplementos]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Complementos (categorias) CRUD
  const createComplemento = useCallback(async (nome: string) => {
    const supabase = await getSupabaseClient();
    const payload: any = { nome };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('complemento_categorias' as any).insert(payload);
    if (error) throw error;
    await fetchComplementos();
  }, [empresaId, fetchComplementos]);

  const updateComplemento = useCallback(async (id: string, data: Partial<Complemento>) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('complemento_categorias' as any).update(data as any).eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await fetchComplementos();
  }, [empresaId, fetchComplementos]);

  const deleteComplemento = useCallback(async (id: string) => {
    const supabase = await getSupabaseClient();
    let query = supabase.from('complemento_categorias' as any).delete().eq('id', id);
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { error } = await query;
    if (error) throw error;
    await Promise.all([fetchComplementos(), fetchProdutoComplementos(), fetchItems(), fetchGrupos()]);
  }, [empresaId, fetchComplementos, fetchProdutoComplementos, fetchItems, fetchGrupos]);

  // Items CRUD
  const createItem = useCallback(async (complemento_id: string, nome: string, valor: number, grupo_id?: string | null, escolha_exclusiva?: boolean) => {
    const supabase = await getSupabaseClient();
    const payload: any = { categoria_id: complemento_id, nome, valor, grupo_id: grupo_id || null, escolha_exclusiva: escolha_exclusiva || false };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('complemento_itens' as any).insert(payload);
    if (error) throw error;
    await fetchItems();
  }, [empresaId, fetchItems]);

  const updateItem = useCallback(async (id: string, data: Partial<ComplementoItem>) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('complemento_itens' as any).update(data as any).eq('id', id);
    if (error) throw error;
    await fetchItems();
  }, [fetchItems]);

  const deleteItem = useCallback(async (id: string) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('complemento_itens' as any).delete().eq('id', id);
    if (error) throw error;
    await fetchItems();
  }, [fetchItems]);

  const copyItems = useCallback(async (fromComplementoId: string, toComplementoId: string) => {
    const existing = items.filter(s => s.categoria_id === toComplementoId);
    const existingNames = new Set(existing.map(s => s.nome.toLowerCase()));
    const toCopy = items.filter(s => s.categoria_id === fromComplementoId && !existingNames.has(s.nome.toLowerCase()));
    if (toCopy.length === 0) return 0;
    const supabase = await getSupabaseClient();
    const inserts = toCopy.map(s => ({ categoria_id: toComplementoId, nome: s.nome, valor: s.valor }));
    const { error } = await supabase.from('complemento_itens' as any).insert(inserts as any);
    if (error) throw error;
    await fetchItems();
    return toCopy.length;
  }, [items, fetchItems]);

  // Grupos CRUD
  const createGrupo = useCallback(async (categoria_id: string, nome_grupo: string, tipo_selecao: 'single' | 'multi', min_escolhas: number, max_escolhas: number | null) => {
    const supabase = await getSupabaseClient();
    const existingGrupos = grupos.filter(g => g.categoria_id === categoria_id);
    const nextOrdem = existingGrupos.length > 0 ? Math.max(...existingGrupos.map(g => g.ordem)) + 1 : 0;
    const payload: any = { categoria_id, nome_grupo, tipo_selecao, min_escolhas, max_escolhas, ordem: nextOrdem };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('complemento_grupos' as any).insert(payload);
    if (error) throw error;
    await fetchGrupos();
  }, [empresaId, grupos, fetchGrupos]);

  const updateGrupo = useCallback(async (id: string, data: Partial<GrupoComplemento>) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('complemento_grupos' as any).update(data as any).eq('id', id);
    if (error) throw error;
    await fetchGrupos();
  }, [fetchGrupos]);

  const deleteGrupo = useCallback(async (id: string) => {
    const supabase = await getSupabaseClient();
    // Remove grupo_id from items that belong to this group
    await supabase.from('complemento_itens' as any).update({ grupo_id: null } as any).eq('grupo_id', id);
    const { error } = await supabase.from('complemento_grupos' as any).delete().eq('id', id);
    if (error) throw error;
    await Promise.all([fetchGrupos(), fetchItems()]);
  }, [fetchGrupos, fetchItems]);

  const getGruposDaCategoria = useCallback((categoriaId: string) => {
    return grupos.filter(g => g.categoria_id === categoriaId && g.ativo).sort((a, b) => a.ordem - b.ordem);
  }, [grupos]);

  // Produto-complemento vínculo
  const vincularComplemento = useCallback(async (produto_id: string, categoria_id: string, ordem: number) => {
    const supabase = await getSupabaseClient();
    const payload: any = { produto_id, categoria_id, ordem };
    if (empresaId) payload.empresa_id = empresaId;
    const { error } = await supabase.from('produto_complemento_categorias' as any).insert(payload);
    if (error) throw error;
    await fetchProdutoComplementos();
  }, [empresaId, fetchProdutoComplementos]);

  const desvincularComplemento = useCallback(async (produto_id: string, categoria_id: string) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('produto_complemento_categorias' as any).delete().eq('produto_id', produto_id).eq('categoria_id', categoria_id);
    if (error) throw error;
    await fetchProdutoComplementos();
  }, [fetchProdutoComplementos]);

  const updateVinculoOrdem = useCallback(async (produto_id: string, categoria_id: string, ordem: number) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('produto_complemento_categorias' as any).update({ ordem } as any).eq('produto_id', produto_id).eq('categoria_id', categoria_id);
    if (error) throw error;
    await fetchProdutoComplementos();
  }, [fetchProdutoComplementos]);

  const getCategoriasOrdenadas = useCallback((produto_id: string) => {
    const vinculos = produtoComplementos
      .filter(pc => pc.produto_id === produto_id)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    return vinculos
      .map(v => complementos.find(c => c.id === v.categoria_id && c.ativo))
      .filter(Boolean) as Complemento[];
  }, [produtoComplementos, complementos]);

  const getItemsDaCategoria = useCallback((categoriaId: string) => {
    return items.filter(s => s.categoria_id === categoriaId && s.ativo);
  }, [items]);

  return {
    complementos,
    items,
    grupos,
    produtoComplementos,
    loading,
    createComplemento,
    updateComplemento,
    deleteComplemento,
    createItem,
    updateItem,
    deleteItem,
    copyItems,
    createGrupo,
    updateGrupo,
    deleteGrupo,
    getGruposDaCategoria,
    vincularComplemento,
    desvincularComplemento,
    updateVinculoOrdem,
    getCategoriasOrdenadas,
    getItemsDaCategoria,
    refetch: loadAll,
  };
}
