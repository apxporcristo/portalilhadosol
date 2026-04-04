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
  nome_kit: string;
  categoria_id: string | null;
  observacao: string | null;
  ativo: boolean;
  categoria_nome?: string;
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
  const [form, setForm] = useState({ nome_kit: '', categoria_id: '', observacao: '', ativo: true });
  const [componentes, setComponentes] = useState<{ produto_componente_id: string; quantidade_baixa: number }[]>([]);
  const [deleteKitId, setDeleteKitId] = useState<string | null>(null);

  // Component add form
  const [compProdId, setCompProdId] = useState('');
  const [compQtd, setCompQtd] = useState('1');
  const [searchProd, setSearchProd] = useState('');

  const fetchData = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const [prodRes, kitRes, catRes] = await Promise.all([
      supabase.from('fichas_produtos' as any).select('id, nome_produto, categoria_id').eq('ativo', true).order('nome_produto'),
      supabase.from('fichas_kits' as any).select('*').order('created_at', { ascending: false }),
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
    setForm({ nome_kit: '', categoria_id: '', observacao: '', ativo: true });
    setComponentes([]);
    setShowModal(true);
  };

  const openEdit = (kit: Kit) => {
    setEditKit(kit);
    setForm({ nome_kit: kit.nome_kit || '', categoria_id: kit.categoria_id || '', observacao: kit.observacao || '', ativo: kit.ativo });
    setComponentes((kit.itens || []).map(i => ({ produto_componente_id: i.produto_componente_id, quantidade_baixa: i.quantidade_baixa })));
    setShowModal(true);
  };

  const addComponente = () => {
    if (!compProdId) {
      toast({ title: 'Selecione um produto componente.', variant: 'destructive' });
      return;
    }
    if (componentes.some(c => c.produto_componente_id === compProdId)) {
      toast({ title: 'Este componente já foi adicionado.', variant: 'destructive' });
      return;
    }
    const qtd = parseInt(compQtd) || 1;
    if (qtd <= 0) {
      toast({ title: 'Quantidade deve ser maior que 0.', variant: 'destructive' });
      return;
    }
    setComponentes(prev => [...prev, { produto_componente_id: compProdId, quantidade_baixa: qtd }]);
    setCompProdId('');
    setCompQtd('1');
  };

  const removeComponente = (idx: number) => {
    setComponentes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.produto_principal_id) {
      toast({ title: 'Selecione o produto principal.', variant: 'destructive' });
      return;
    }
    if (componentes.length === 0) {
      toast({ title: 'Adicione ao menos um componente.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const supabase = await getSupabaseClient();
      if (editKit) {
        // Update kit
        await supabase.from('fichas_kits' as any).update({
          produto_principal_id: form.produto_principal_id,
          observacao: form.observacao.trim() || null,
          ativo: form.ativo,
        } as any).eq('id', editKit.id);
        // Delete old items and re-insert
        await supabase.from('fichas_kit_itens' as any).delete().eq('kit_id', editKit.id);
        await supabase.from('fichas_kit_itens' as any).insert(
          componentes.map(c => ({ kit_id: editKit.id, produto_componente_id: c.produto_componente_id, quantidade_baixa: c.quantidade_baixa })) as any
        );
        toast({ title: 'Kit atualizado!' });
      } else {
        // Create kit
        const { data: newKit, error } = await supabase.from('fichas_kits' as any).insert({
          produto_principal_id: form.produto_principal_id,
          observacao: form.observacao.trim() || null,
          ativo: form.ativo,
        } as any).select('id').single();
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

  // Filter products for selects
  const filteredProdutos = searchProd.trim()
    ? produtos.filter(p => p.nome_produto.toLowerCase().includes(searchProd.toLowerCase()))
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
              <TableHead className="text-center">Componentes</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum kit cadastrado.</TableCell></TableRow>
            ) : (
              kits.map(kit => (
                <TableRow key={kit.id}>
                  <TableCell className="font-medium">{kit.produto_nome}</TableCell>
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
            {/* Produto principal */}
            <div className="space-y-2">
              <Label>Produto principal *</Label>
              <Select value={form.produto_principal_id} onValueChange={(v) => setForm(p => ({ ...p, produto_principal_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_produto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Select value={compProdId} onValueChange={setCompProdId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {produtos
                        .filter(p => p.id !== form.produto_principal_id && !componentes.some(c => c.produto_componente_id === p.id))
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome_produto}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Qtd baixa</Label>
                  <Input type="number" min="1" value={compQtd} onChange={e => setCompQtd(e.target.value)} />
                </div>
                <Button size="sm" onClick={addComponente}><Plus className="h-4 w-4" /></Button>
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

      <ConfirmDialog open={!!deleteKitId} onOpenChange={(open) => !open && setDeleteKitId(null)} title="Excluir kit" description="Tem certeza que deseja excluir este kit? Os componentes serão removidos." onConfirm={handleDelete} />
    </div>
  );
}
