import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, Search, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/hooks/useVouchers';

interface ProdutoAtivo {
  id: string;
  nome_produto: string;
  categoria_id: string;
  categoria_nome: string;
  valor: number;
}

interface ItemNota {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor_comprado: number;
  margem_lucro: number;
}

interface EntradaHeader {
  id: string;
  numero_nota: string;
  data_compra: string;
  observacao: string | null;
  usuario_nome: string | null;
  created_at: string;
  total_itens?: number;
  total_comprado?: number;
  total_venda?: number;
}

interface EntradaItem {
  id: string;
  produto_nome: string;
  quantidade: number;
  valor_comprado: number;
  margem_lucro: number;
  valor_venda: number;
  valor_total_comprado: number;
  valor_total_venda: number;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function EntradaMercadoriaTab() {
  const [produtos, setProdutos] = useState<ProdutoAtivo[]>([]);
  const [entradas, setEntradas] = useState<EntradaHeader[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [numeroNota, setNumeroNota] = useState('');
  const [dataCompra, setDataCompra] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<ItemNota[]>([]);
  const [saving, setSaving] = useState(false);

  // Product search modal
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [addingItemIndex, setAddingItemIndex] = useState<number | null>(null);

  // Detail view
  const [detailEntrada, setDetailEntrada] = useState<EntradaHeader | null>(null);
  const [detailItens, setDetailItens] = useState<EntradaItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const [prodRes, entRes] = await Promise.all([
      supabase.from('vw_fichas_ativas' as any).select('*'),
      supabase.from('entradas_mercadoria' as any).select('*').order('data_compra', { ascending: false }).order('created_at', { ascending: false }),
    ]);

    if (prodRes.data) {
      setProdutos((prodRes.data as any[]).map(d => ({
        id: d.id,
        nome_produto: d.nome_produto ?? d.nome ?? '',
        categoria_id: d.categoria_id ?? '',
        categoria_nome: d.categoria_nome ?? d.nome_categoria ?? '',
        valor: d.valor ?? 0,
      })));
    }

    if (entRes.data) {
      // Fetch item summaries for each entrada
      const entradasData = entRes.data as any[];
      if (entradasData.length > 0) {
        const ids = entradasData.map(e => e.id);
        const { data: itensData } = await supabase
          .from('entradas_mercadoria_itens' as any)
          .select('entrada_id, quantidade, valor_total_comprado, valor_total_venda')
          .in('entrada_id', ids);

        const summary: Record<string, { count: number; totalC: number; totalV: number }> = {};
        (itensData as any[] || []).forEach(i => {
          if (!summary[i.entrada_id]) summary[i.entrada_id] = { count: 0, totalC: 0, totalV: 0 };
          summary[i.entrada_id].count += 1;
          summary[i.entrada_id].totalC += Number(i.valor_total_comprado) || 0;
          summary[i.entrada_id].totalV += Number(i.valor_total_venda) || 0;
        });

        setEntradas(entradasData.map(e => ({
          ...e,
          total_itens: summary[e.id]?.count || 0,
          total_comprado: summary[e.id]?.totalC || 0,
          total_venda: summary[e.id]?.totalV || 0,
        })));
      } else {
        setEntradas([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredProdutos = useMemo(() => {
    if (!prodSearch.trim()) return produtos;
    const q = prodSearch.toLowerCase();
    return produtos.filter(p => p.nome_produto.toLowerCase().includes(q) || p.categoria_nome.toLowerCase().includes(q));
  }, [produtos, prodSearch]);

  const addItem = () => {
    setItens(prev => [...prev, { produto_id: '', produto_nome: '', quantidade: 1, valor_comprado: 0, margem_lucro: 100, }]);
  };

  const removeItem = (idx: number) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemNota, value: any) => {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const selectProduct = (prod: ProdutoAtivo) => {
    if (addingItemIndex !== null) {
      updateItem(addingItemIndex, 'produto_id', prod.id);
      updateItem(addingItemIndex, 'produto_nome', prod.nome_produto);
    }
    setShowProdModal(false);
    setProdSearch('');
    setAddingItemIndex(null);
  };

  const calcValorVenda = (item: ItemNota) => item.valor_comprado + (item.valor_comprado * item.margem_lucro) / 100;
  const calcTotalComprado = (item: ItemNota) => item.quantidade * item.valor_comprado;
  const calcTotalVenda = (item: ItemNota) => item.quantidade * calcValorVenda(item);

  const handleSave = async () => {
    if (!numeroNota.trim()) { toast({ title: 'Informe o número da nota.', variant: 'destructive' }); return; }
    if (!dataCompra) { toast({ title: 'Informe a data da compra.', variant: 'destructive' }); return; }
    if (itens.length === 0) { toast({ title: 'Adicione ao menos um item.', variant: 'destructive' }); return; }
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      if (!item.produto_id) { toast({ title: `Item ${i + 1}: selecione um produto.`, variant: 'destructive' }); return; }
      if (item.quantidade <= 0) { toast({ title: `Item ${i + 1}: quantidade deve ser maior que zero.`, variant: 'destructive' }); return; }
      if (item.valor_comprado < 0) { toast({ title: `Item ${i + 1}: valor comprado inválido.`, variant: 'destructive' }); return; }
      if (item.margem_lucro <= 0) { toast({ title: `Item ${i + 1}: margem de lucro deve ser maior que zero.`, variant: 'destructive' }); return; }
    }

    setSaving(true);
    try {
      const supabase = await getSupabaseClient();
      const { data: entrada, error: errH } = await supabase
        .from('entradas_mercadoria' as any)
        .insert({ numero_nota: numeroNota.trim(), data_compra: dataCompra, observacao: observacao.trim() || null } as any)
        .select('id')
        .single();
      if (errH || !entrada) throw errH || new Error('Erro ao salvar cabeçalho');

      const rows = itens.map(item => ({
        entrada_id: (entrada as any).id,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade: item.quantidade,
        valor_comprado: item.valor_comprado,
        margem_lucro: item.margem_lucro,
        valor_venda: calcValorVenda(item),
        valor_total_comprado: calcTotalComprado(item),
        valor_total_venda: calcTotalVenda(item),
      }));

      const { error: errI } = await supabase.from('entradas_mercadoria_itens' as any).insert(rows as any);
      if (errI) throw errI;

      toast({ title: 'Entrada de mercadoria salva com sucesso!' });
      setNumeroNota('');
      setDataCompra(new Date().toISOString().slice(0, 10));
      setObservacao('');
      setItens([]);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.message || 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (entrada: EntradaHeader) => {
    setDetailEntrada(entrada);
    setLoadingDetail(true);
    const supabase = await getSupabaseClient();
    const { data } = await supabase
      .from('entradas_mercadoria_itens' as any)
      .select('*')
      .eq('entrada_id', entrada.id);
    setDetailItens((data as any[] || []).map(d => ({ ...d })));
    setLoadingDetail(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Entrada de Mercadoria</h2>

      {/* Form */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Número da nota *</Label>
              <Input value={numeroNota} onChange={e => setNumeroNota(e.target.value)} placeholder="Ex: NF-001" />
            </div>
            <div className="space-y-1">
              <Label>Data da compra *</Label>
              <Input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Itens da nota</Label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
            </div>

            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item adicionado. Clique em "Adicionar item".</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Produto</TableHead>
                      <TableHead className="w-24 text-center">Qtd</TableHead>
                      <TableHead className="w-32 text-center">Compra</TableHead>
                      <TableHead className="w-28 text-center">% Margem</TableHead>
                      <TableHead className="w-32 text-center">Venda</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, idx) => {
                      const vVenda = calcValorVenda(item);
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Button variant="outline" size="sm" className="w-full justify-start text-left h-8 text-xs" onClick={() => { setAddingItemIndex(idx); setShowProdModal(true); }}>
                              <Search className="h-3 w-3 mr-1 shrink-0" />
                              <span className="truncate">{item.produto_nome || 'Selecionar...'}</span>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={1} className="h-8 text-center text-xs" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step={0.01} className="h-8 text-right text-xs" value={item.valor_comprado} onChange={e => updateItem(idx, 'valor_comprado', parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0.01} step={0.01} className="h-8 text-center text-xs" value={item.margem_lucro} onChange={e => updateItem(idx, 'margem_lucro', parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">{fmt(vVenda)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex gap-4 text-xs text-muted-foreground px-3 py-2 border-t">
                  <span>Total comprado: <strong>{fmt(itens.reduce((s, i) => s + calcTotalComprado(i), 0))}</strong></span>
                  <span>Total venda: <strong>{fmt(itens.reduce((s, i) => s + calcTotalVenda(i), 0))}</strong></span>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar entrada'}
          </Button>
        </CardContent>
      </Card>

      {/* Listing */}
      <div>
        <h3 className="text-base font-semibold mb-3">Entradas lançadas</h3>
        {entradas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrada de mercadoria encontrada.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nota</TableHead>
                  <TableHead>Data compra</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Total comprado</TableHead>
                  <TableHead className="text-right">Total venda</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map(e => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(e)}>
                    <TableCell className="font-medium">{e.numero_nota}</TableCell>
                    <TableCell>{new Date(e.data_compra + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-center">{e.total_itens ?? 0}</TableCell>
                    <TableCell className="text-right">{fmt(e.total_comprado ?? 0)}</TableCell>
                    <TableCell className="text-right">{fmt(e.total_venda ?? 0)}</TableCell>
                    <TableCell>{e.usuario_nome || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Product search modal */}
      <Dialog open={showProdModal} onOpenChange={open => { if (!open) { setShowProdModal(false); setAddingItemIndex(null); setProdSearch(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Selecionar Produto</DialogTitle></DialogHeader>
          <Input placeholder="Buscar produto..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} autoFocus />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredProdutos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
            ) : (
              filteredProdutos.map(p => (
                <Button key={p.id} variant="ghost" className="w-full justify-start h-auto py-2" onClick={() => selectProduct(p)}>
                  <Package className="h-4 w-4 mr-2 shrink-0" />
                  <span className="text-left">
                    <span className="block text-sm font-medium">{p.nome_produto}</span>
                    <span className="block text-xs text-muted-foreground">{p.categoria_nome} — {fmt(p.valor)}</span>
                  </span>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={!!detailEntrada} onOpenChange={open => { if (!open) setDetailEntrada(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nota {detailEntrada?.numero_nota}</DialogTitle></DialogHeader>
          {detailEntrada && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Data compra:</strong> {new Date(detailEntrada.data_compra + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                <div><strong>Usuário:</strong> {detailEntrada.usuario_nome || '—'}</div>
                {detailEntrada.observacao && <div className="col-span-2"><strong>Obs:</strong> {detailEntrada.observacao}</div>}
              </div>
              {loadingDetail ? (
                <p className="text-center text-muted-foreground py-4">Carregando itens...</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Compra</TableHead>
                        <TableHead className="text-center">Margem</TableHead>
                        <TableHead className="text-right">Venda</TableHead>
                        <TableHead className="text-right">Total Comprado</TableHead>
                        <TableHead className="text-right">Total Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailItens.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.produto_nome}</TableCell>
                          <TableCell className="text-center">{item.quantidade}</TableCell>
                          <TableCell className="text-right">{fmt(Number(item.valor_comprado))}</TableCell>
                          <TableCell className="text-center">{Number(item.margem_lucro).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{fmt(Number(item.valor_venda))}</TableCell>
                          <TableCell className="text-right">{fmt(Number(item.valor_total_comprado))}</TableCell>
                          <TableCell className="text-right">{fmt(Number(item.valor_total_venda))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
