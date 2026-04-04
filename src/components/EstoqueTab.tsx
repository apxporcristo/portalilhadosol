import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSupabaseClient } from '@/hooks/useVouchers';

interface EstoqueItem {
  produto_id: string;
  nome_produto: string;
  categoria_id: string;
  nome_categoria: string;
  estoque_negativo: boolean;
  quantidade_comprada: number;
  quantidade_vendida: number;
  estoque_atual: number;
  ultimo_valor_comprado: number | null;
  ultimo_valor_venda: number | null;
  valor_venda_atual: number;
}

interface Categoria {
  id: string;
  nome_categoria: string;
}

const fmt = (v: number | null) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

export default function EstoqueTab() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterProduto, setFilterProduto] = useState('');
  const [searchText, setSearchText] = useState('');

  const fetchData = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const [estRes, catRes] = await Promise.all([
      supabase.from('vw_estoque' as any).select('*'),
      supabase.from('fichas_categorias' as any).select('id, nome_categoria').eq('ativo', true),
    ]);
    if (estRes.data) setItems(estRes.data as any[]);
    if (catRes.data) setCategorias(catRes.data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (filterCategoria !== 'all') list = list.filter(i => i.categoria_id === filterCategoria);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(i => i.nome_produto.toLowerCase().includes(q) || i.nome_categoria.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.nome_categoria.localeCompare(b.nome_categoria) || a.nome_produto.localeCompare(b.nome_produto));
  }, [items, filterCategoria, searchText]);

  const clearFilters = () => {
    setFilterCategoria('all');
    setFilterProduto('');
    setSearchText('');
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando estoque...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Estoque</h2>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
        <div className="flex-1">
          <Input placeholder="Buscar produto ou categoria..." value={searchText} onChange={e => setSearchText(e.target.value)} className="max-w-md" />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_categoria}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterCategoria !== 'all' || searchText) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Limpar</Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              
              <TableHead>Produto</TableHead>
              <TableHead className="text-center">Comprado</TableHead>
              <TableHead className="text-center">Vendido</TableHead>
              <TableHead className="text-center">Estoque atual</TableHead>
              <TableHead className="text-center">Est. Negativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum item encontrado.</TableCell></TableRow>
            ) : (
              filtered.map(item => {
                const semEstoque = item.estoque_atual <= 0 && !item.estoque_negativo;
                const negativo = item.estoque_atual < 0;
                return (
                  <TableRow key={item.produto_id} className={semEstoque ? 'bg-destructive/5' : negativo ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                    <TableCell>{item.nome_categoria}</TableCell>
                    <TableCell className="font-medium">
                      {item.nome_produto}
                      {semEstoque && <Badge variant="destructive" className="ml-2 text-xs">Sem estoque</Badge>}
                    </TableCell>
                    <TableCell className="text-center">{item.quantidade_comprada}</TableCell>
                    <TableCell className="text-center">{item.quantidade_vendida}</TableCell>
                    <TableCell className={`text-center font-semibold ${negativo ? 'text-destructive' : item.estoque_atual === 0 ? 'text-yellow-600' : ''}`}>
                      {item.estoque_atual}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.estoque_negativo ? (
                        <Badge variant="outline" className="text-xs">Aceita negativo</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Não</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
