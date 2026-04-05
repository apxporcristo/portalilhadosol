import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, Search, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/hooks/useVouchers';

interface ProdutoSimples {
  id: string;
  nome_produto: string;
  categoria_id: string;
  categoria_nome?: string;
}

interface KitItem {
  id: string;
  kit_id: string;
  produto_componente_id: string;
  quantidade_baixa: number;
  produto_nome?: string;
}

interface Categoria {
  id: string;
  nome_categoria: string;
}

interface Kit {
  id: string;
  produto_principal_id: string | null;
  categoria_id: string | null;
  observacao: string | null;
  ativo: boolean;
  categoria_nome?: string;
  produto_principal_nome?: string;
  itens?: KitItem[];
}

export default function KitTab() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [produtos, setProdutos] = useState<ProdutoSimples[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Kit form
  const [showModal, setShowModal] = useState(false);
  const [editKit, setEditKit] = useState<Kit | null>(null);
  const [form, setForm] = useState({ produto_principal_id: '', categoria_id: '', observacao: '', ativo: true });
  const [componentes, setComponentes] = useState<{ produto_componente_id: string; quantidade_baixa: number }[]>([]);
  const [deleteKitId, setDeleteKitId] = useState<string | null>(null);

  // Component add form
  const [compQtd, setCompQtd] = useState('1');

  // Product search modals
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [showPrincipalModal, setShowPrincipalModal] = useState(false);
  const [principalSearch, setPrincipalSearch] = useState('');

  const fetchData = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const [prodRes, kitRes, catRes] = await Promise.all([
      supabase.from('fichas_produtos' as any).select('id, nome_produto, categoria_id').eq('ativo', true).order('nome_produto'),
      supabase.from('fichas_kits' as any).select('id, produto_principal_id, categoria_id, observacao, ativo, created_at').order('created_at', { ascending: false }),
      supabase.from('fichas_categorias' as any).select('id, nome_categoria').eq('ativo', true).order('nome_categoria'),
    ]);

    const prodList = (prodRes.data || []) as ProdutoSimples[];
    setProdutos(prodList);
    setCategorias((catRes.data || []) as Categoria[]);

    const kitList = (kitRes.data || []) as Kit[];
    if (kitList.length > 0) {
      const kitIds = kitList.map(k => k.id);
      const { data: itensData } = await supabase
        .from('fichas_kit_itens' as any)
        .select('*')
        .in('kit_id', kitIds);
      const itens = (itensData || []) as KitItem[];
      const cats = (catRes.data || []) as Categoria[];

      for (const kit of kitList) {
        kit.categoria_nome = cats.find(c => c.id === kit.categoria_id)?.nome_categoria || '—';
        kit.produto_principal_nome = prodList.find(p => p.id === kit.produto_principal_id)?.nome_produto || '—';
        kit.itens = itens
          .filter(i => i.kit_id === kit.id)
          .map(i => ({ ...i, produto_nome: prodList.find(p => p.id === i.produto_componente_id)?.nome_produto || '—' }));
      }
    }
    setKits(kitList);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProdNome = (id: string) => produtos.find(p => p.id === id)?.nome_produto || '—';

  const openNew = () => {
    setEditKit(null);
    setForm({ produto_principal_id: '', categoria_id: '', observacao: '', ativo: true });
    setComponentes([]);
    setShowModal(true);
  };

  const openEdit = (kit: Kit) => {
    setEditKit(kit);
    setForm({
      produto_principal_id: kit.produto_principal_id || '',
      categoria_id: kit.categoria_id || '',
      observacao: kit.observacao || '',
      ativo: kit.ativo,
    });
    setComponentes((kit.itens || []).map(i => ({ produto_componente_id: i.produto_componente_id, quantidade_baixa: i.quantidade_baixa })));
    setShowModal(true);
  };

  const selectComponente = (prodId: string) => {
    if (prodId === form.produto_principal_id) {
      toast({ title: 'O componente não pode ser o mesmo que o produto principal.', variant: 'destructive' });
      return;
    }
    if (componentes.some(c => c.produto_componente_id === prodId)) {
      toast({ title: 'Este componente já foi adicionado.', variant: 'destructive' });
      return;
    }
    const qtd = parseInt(compQtd) || 1;
    if (qtd <= 0) {
      toast({ title: 'Quantidade deve ser maior que 0.', variant: 'destructive' });
      return;
    }
    setComponentes(prev => [...prev, { produto_componente_id: prodId, quantidade_baixa: qtd }]);
    setCompQtd('1');
    setShowProdModal(false);
    setProdSearch('');
  };

  const selectPrincipal = (prodId: string) => {
    setForm(p => ({ ...p, produto_principal_id: prodId }));
    setShowPrincipalModal(false);
    setPrincipalSearch('');
    // Remove from components if already there
    setComponentes(prev => prev.filter(c => c.produto_componente_id !== prodId));
  };

  const removeComponente = (idx: number) => {
    setComponentes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.categoria_id) {
      toast({ title: 'Selecione a categoria.', variant: 'destructive' });
      return;
    }
    if (!form.produto_principal_id) {
      toast({ title: 'Selecione o produto principal.', variant: 'destructive' });
      return;
    }
    if (componentes.length === 0) {
      toast({ title: 'Adicione ao menos um componente.', variant: 'destructive' });
      return;
    }
    if (componentes.some(c => c.quantidade_baixa <= 0)) {
      toast({ title: 'Todos os componentes devem ter quantidade > 0.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const supabase = await getSupabaseClient();
      const kitData = {
        categoria_id: form.categoria_id,
        produto_principal_id: form.produto_principal_id,
        observacao: form.observacao.trim() || null,
        ativo: form.ativo,
      };

      if (editKit) {
        await supabase.from('fichas_kits' as any).update(kitData as any).eq('id', editKit.id);
        await supabase.from('fichas_kit_itens' as any).delete().eq('kit_id', editKit.id);
        await supabase.from('fichas_kit_itens' as any).insert(
          componentes.map(c => ({ kit_id: editKit.id, produto_componente_id: c.produto_componente_id, quantidade_baixa: c.quantidade_baixa })) as any
        );
        toast({ title: 'Kit atualizado!' });
      } else {
        const { data: newKit, error } = await supabase.from('fichas_kits' as any).insert(kitData as any).select('id').single();
        if (error || !newKit) throw error || new Error('Erro ao criar kit');
        await supabase.from('fichas_kit_itens' as any).insert(
          componentes.map(c => ({ kit_id: (newKit as any).id, produto_componente_id: c.produto_componente_id, quantidade_baixa: c.quantidade_baixa })) as any
        );
        toast({ title: 'Kit cadastrado!' });
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar kit', description: err?.message || 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteKitId) return;
    try {
      const supabase = await getSupabaseClient();
      await supabase.from('fichas_kit_itens' as any).delete().eq('kit_id', deleteKitId);
      await supabase.from('fichas_kits' as any).delete().eq('id', deleteKitId);
      toast({ title: 'Kit excluído!' });
      fetchData();
    } catch {
      toast({ title: 'Erro ao excluir kit.', variant: 'destructive' });
    }
    setDeleteKitId(null);
  };

  const toggleAtivo = async (kit: Kit) => {
    const supabase = await getSupabaseClient();
    await supabase.from('fichas_kits' as any).update({ ativo: !kit.ativo } as any).eq('id', kit.id);
    toast({ title: kit.ativo ? 'Kit desativado' : 'Kit ativado' });
    fetchData();
  };

  const availableProducts = produtos.filter(p => !componentes.some(c => c.produto_componente_id === p.id) && p.id !== form.produto_principal_id);
  const filteredModalProducts = prodSearch.trim()
    ? availableProducts.filter(p => p.nome_produto.toLowerCase().includes(prodSearch.toLowerCase()))
    : availableProducts;

  const filteredPrincipalProducts = principalSearch.trim()
    ? produtos.filter(p => p.nome_produto.toLowerCase().includes(principalSearch.toLowerCase()))
    : produtos;

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando kits...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kits</h2>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Kit
        </Button>
      </div>

      {/* Listagem de kits */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
           <TableHeader>
            <TableRow>
              <TableHead>Produto Principal</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">Componentes</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum kit cadastrado.</TableCell></TableRow>
            ) : (
              kits.map(kit => (
                <TableRow key={kit.id}>
                  <TableCell className="font-medium">{kit.produto_principal_nome || '—'}</TableCell>
                  <TableCell>{kit.categoria_nome || '—'}</TableCell>
                  <TableCell className="text-center">{kit.itens?.length || 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{kit.observacao || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={kit.ativo ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleAtivo(kit)}>
                      {kit.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(kit)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteKitId(kit.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Kit */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); setEditKit(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editKit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={form.categoria_id} onValueChange={(v) => setForm(p => ({ ...p, categoria_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_categoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produto principal */}
            <div className="space-y-2">
              <Label>Produto Principal *</Label>
              <Button variant="outline" className="w-full justify-start font-normal" onClick={() => { setPrincipalSearch(''); setShowPrincipalModal(true); }}>
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                {form.produto_principal_id ? getProdNome(form.produto_principal_id) : 'Selecione o produto principal...'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Ex: Kit festa" maxLength={100} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm(p => ({ ...p, ativo: v }))} />
              <Label>Ativo</Label>
            </div>

            {/* Componentes */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Componentes do Kit</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Produto componente</Label>
                  <Button variant="outline" className="w-full justify-start font-normal" onClick={() => { setProdSearch(''); setShowProdModal(true); }}>
                    <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                    Selecione...
                  </Button>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Qtd baixa</Label>
                  <Input type="number" min="1" value={compQtd} onChange={e => setCompQtd(e.target.value)} />
                </div>
              </div>

              {componentes.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Componente</TableHead>
                        <TableHead className="text-center w-24">Qtd baixa</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {componentes.map((comp, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{getProdNome(comp.produto_componente_id)}</TableCell>
                          <TableCell className="text-center">{comp.quantidade_baixa}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeComponente(idx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {componentes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum componente adicionado.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); setEditKit(null); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {editKit ? 'Salvar alterações' : 'Cadastrar kit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal busca produto principal */}
      <Dialog open={showPrincipalModal} onOpenChange={setShowPrincipalModal}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Produto Principal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={principalSearch} onChange={e => setPrincipalSearch(e.target.value)} className="pl-9" autoFocus />
            </div>
            <div className="max-h-[50vh] overflow-y-auto border rounded-md">
              {filteredPrincipalProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
              ) : (
                filteredPrincipalProducts.map(p => (
                  <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0 transition-colors" onClick={() => selectPrincipal(p.id)}>
                    {p.nome_produto}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal busca componente */}
      <Dialog open={showProdModal} onOpenChange={setShowProdModal}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Componente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="pl-9" autoFocus />
            </div>
            <div className="max-h-[50vh] overflow-y-auto border rounded-md">
              {filteredModalProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
              ) : (
                filteredModalProducts.map(p => (
                  <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0 transition-colors" onClick={() => selectComponente(p.id)}>
                    {p.nome_produto}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteKitId} onOpenChange={(open) => !open && setDeleteKitId(null)} title="Excluir kit" description="Tem certeza que deseja excluir este kit? Os componentes serão removidos." onConfirm={handleDelete} />
    </div>
  );
}
