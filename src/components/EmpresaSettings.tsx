import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-external';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Power, Search, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

interface Empresa {
  id: string;
  nome_fantasia: string;
  cnpj: string | null;
  ativo: boolean;
}

export function EmpresaSettings() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [saving, setSaving] = useState(false);

  const [fNome, setFNome] = useState('');
  const [fCnpj, setFCnpj] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getSupabaseClient();
      const { data, error } = await db.from('empresas' as any).select('id, nome_fantasia, cnpj, ativo').order('nome_fantasia');
      if (error) throw error;
      setEmpresas((data as any[]) || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  const formatCnpj = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 14);
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, '$1.$2.$3/$4-$5')
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/, '$1.$2.$3/$4')
      .replace(/^(\d{2})(\d{3})(\d{0,3})$/, '$1.$2.$3')
      .replace(/^(\d{2})(\d{0,3})$/, '$1.$2')
      .replace(/^(\d{0,2})$/, '$1');
  };

  const openCreate = () => {
    setEditing(null);
    setFNome(''); setFCnpj(''); setFAtivo(true);
    setModalOpen(true);
  };

  const openEdit = (e: Empresa) => {
    setEditing(e);
    setFNome(e.nome_fantasia);
    setFCnpj(e.cnpj ? formatCnpj(e.cnpj) : '');
    setFAtivo(e.ativo);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!fNome.trim()) {
      toast({ title: 'Erro', description: 'Nome da empresa é obrigatório.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const db = await getSupabaseClient();
      const cnpjClean = fCnpj.replace(/\D/g, '') || null;

      if (editing) {
        const { error } = await db.from('empresas' as any).update({
          nome: fNome.trim(),
          cnpj: cnpjClean,
          ativo: fAtivo,
        } as any).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Empresa atualizada!' });
      } else {
        const { error } = await db.from('empresas' as any).insert({
          nome: fNome.trim(),
          cnpj: cnpjClean,
          ativo: fAtivo,
        } as any);
        if (error) throw error;
        toast({ title: 'Empresa cadastrada!' });
      }

      setModalOpen(false);
      await fetchEmpresas();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const toggleAtivo = async (e: Empresa) => {
    try {
      const db = await getSupabaseClient();
      const { error } = await db.from('empresas' as any).update({ ativo: !e.ativo } as any).eq('id', e.id);
      if (error) throw error;
      toast({ title: e.ativo ? 'Empresa desativada' : 'Empresa ativada' });
      await fetchEmpresas();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = empresas.filter(e => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return e.nome_fantasia.toLowerCase().includes(s) || (e.cnpj || '').includes(s.replace(/\D/g, ''));
  });

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Empresas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchEmpresas}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nova Empresa
            </Button>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {search ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}
          </p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} className={!e.ativo ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.cnpj ? formatCnpj(e.cnpj) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={e.ativo ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleAtivo(e)}>
                        {e.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAtivo(e)} title={e.ativo ? 'Desativar' : 'Ativar'}>
                          <Power className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input inputMode="numeric" value={fCnpj} onChange={e => setFCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch checked={fAtivo} onCheckedChange={setFAtivo} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
