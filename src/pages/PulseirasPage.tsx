import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Watch, User, Phone, CreditCard, Clock, Package, History, Trash2, RotateCcw, DollarSign, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { usePulseiras, PulseiraResumo, PulseiraSaldo, PulseiraHistorico } from '@/hooks/usePulseiras';
import { useOptionalUserSession } from '@/contexts/UserSessionContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function PulseirasPage() {
  const navigate = useNavigate();
  const userSession = useOptionalUserSession();
  const {
    loading, pulseirasAbertas, pulseirasFechadas, detalhe, saldos, historico,
    saldoLoading, historicoLoading, saldoError, historicoError,
    listarAbertas, listarFechadas, carregarDetalhe, limpar,
    abrirPulseira, registrarBaixa, registrarAbateCredito,
    fecharPulseira, reabrirPulseira, excluirPulseira,
  } = usePulseiras();

  const [busca, setBusca] = useState('');
  const [activeTab, setActiveTab] = useState('abertas');

  // Modals
  const [abrirModal, setAbrirModal] = useState(false);
  const [abateModal, setAbateModal] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [historicoModal, setHistoricoModal] = useState(false);

  // Baixa por item do saldo
  const [baixaItem, setBaixaItem] = useState<PulseiraSaldo | null>(null);
  const [baixaQtd, setBaixaQtd] = useState(1);
  const [baixaMotivo, setBaixaMotivo] = useState('');

  // Form: abrir
  const [fNumero, setFNumero] = useState('');
  const [fNome, setFNome] = useState('');
  const [fTelefone, setFTelefone] = useState('');
  const [fCpf, setFCpf] = useState('');

  // Form: abate
  const [aValor, setAValor] = useState('');
  const [aDesc, setADesc] = useState('');

  // Busca saldo
  const [buscaSaldo, setBuscaSaldo] = useState('');
  const [mostrarTodosSaldos, setMostrarTodosSaldos] = useState(false);

  useEffect(() => { listarAbertas(); listarFechadas(); }, [listarAbertas, listarFechadas]);

  useEffect(() => {
    const handler = () => { listarAbertas(); listarFechadas(); };
    const vis = () => { if (document.visibilityState === 'visible') handler(); };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('focus', handler); document.removeEventListener('visibilitychange', vis); };
  }, [listarAbertas, listarFechadas]);

  const filtrar = (list: PulseiraResumo[]) => {
    if (!busca.trim()) return list;
    const q = busca.toLowerCase();
    return list.filter(p =>
      p.numero.toLowerCase().includes(q) ||
      p.nome_cliente.toLowerCase().includes(q) ||
      (p.telefone || '').toLowerCase().includes(q)
    );
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return d; }
  };

  const formatMoney = (v: number) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`;

  const tipoBadge = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('item') || t.includes('compra') || t.includes('inclusao')) return { label: 'Inclusão', variant: 'default' as const };
    if (t.includes('consumo')) return { label: 'Consumo', variant: 'secondary' as const };
    if (t.includes('baixa')) return { label: 'Baixa', variant: 'secondary' as const };
    if (t.includes('abate') || t.includes('credito')) return { label: 'Abate', variant: 'destructive' as const };
    if (t.includes('abertura')) return { label: 'Abertura', variant: 'outline' as const };
    if (t.includes('fechamento')) return { label: 'Fechamento', variant: 'destructive' as const };
    if (t.includes('reabertura')) return { label: 'Reabertura', variant: 'outline' as const };
    return { label: tipo, variant: 'secondary' as const };
  };

  // Pulseira tem itens lançados?
  const temItens = (detalhe?.quantidade_itens ?? 0) > 0 || saldos.length > 0 || historico.length > 0;

  // Handlers
  const handleAbrir = async () => {
    if (!fNumero.trim() || !fNome.trim()) {
      toast({ title: 'Preencha número e nome.', variant: 'destructive' });
      return;
    }
    const userId = userSession?.access?.user_id;
    const userName = userSession?.access?.nome || userSession?.user?.email || undefined;
    const result = await abrirPulseira({
      numero: fNumero.trim(),
      nome_cliente: fNome.trim(),
      telefone: fTelefone.trim() || undefined,
      cpf: fCpf.trim() || undefined,
      aberta_por: userId,
      aberta_por_nome: userName,
    });
    if (result) {
      setAbrirModal(false);
      setFNumero(''); setFNome(''); setFTelefone(''); setFCpf('');
    }
  };

  const handleBaixaItem = async () => {
    if (!detalhe || !baixaItem || baixaQtd < 1) return;
    const maxQtd = baixaItem.quantidade_disponivel ?? 0;
    if (baixaQtd > maxQtd) {
      toast({ title: 'Quantidade excede o disponível', description: `Máximo: ${maxQtd}`, variant: 'destructive' });
      return;
    }
    const ok = await registrarBaixa(detalhe.id, {
      produto_id: baixaItem.produto_id || undefined,
      produto_nome: baixaItem.produto_nome || 'Sem nome',
      quantidade: baixaQtd,
      valor_unitario: maxQtd > 0 ? (baixaItem.valor_disponivel ?? 0) / maxQtd : 0,
      motivo: baixaMotivo || undefined,
      usuario_id: userSession?.access?.user_id,
      usuario_nome: userSession?.access?.nome || userSession?.user?.email || undefined,
    });
    if (ok) {
      setBaixaItem(null);
      setBaixaQtd(1);
      setBaixaMotivo('');
    }
  };

  const handleAbate = async () => {
    if (!detalhe || !aValor) return;
    const ok = await registrarAbateCredito(detalhe.id, {
      valor: parseFloat(aValor),
      descricao: aDesc || undefined,
      usuario_id: userSession?.access?.user_id,
      usuario_nome: userSession?.access?.nome || userSession?.user?.email || undefined,
    });
    if (ok) { setAbateModal(false); setAValor(''); setADesc(''); }
  };

  const filteredSaldos = useMemo(() => {
    let list = buscaSaldo.trim()
      ? saldos.filter(s => (s.produto_nome || '').toLowerCase().includes(buscaSaldo.toLowerCase()))
      : [...saldos];
    // Hide fully consumed products unless "mostrar todos" is active
    if (!mostrarTodosSaldos) {
      list = list.filter(s => (s.quantidade_disponivel ?? 0) > 0);
    }
    return list.sort((a, b) => {
      const aDisp = a.quantidade_disponivel ?? 0;
      const bDisp = b.quantidade_disponivel ?? 0;
      if (aDisp === 0 && bDisp > 0) return 1;
      if (bDisp === 0 && aDisp > 0) return -1;
      return (a.produto_nome || '').localeCompare(b.produto_nome || '', 'pt-BR');
    });
  }, [saldos, buscaSaldo, mostrarTodosSaldos]);

  const isAtiva = detalhe?.status === 'ativa';
  const isFechada = detalhe?.status === 'fechada';

  const renderPulseiraCard = (p: PulseiraResumo) => (
    <button
      key={p.id}
      onClick={() => carregarDetalhe(p.id)}
      className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors space-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="font-bold">#{p.numero}</span>
        <Badge variant={p.status === 'ativa' ? 'default' : 'secondary'}>{p.status}</Badge>
      </div>
      <div className="text-sm flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        {p.nome_cliente}
        {p.telefone && <><Phone className="h-3 w-3 text-muted-foreground ml-2" />{p.telefone}</>}
      </div>
      <div className="text-xs text-muted-foreground flex gap-4">
        <span>Comprado: {formatMoney(p.total_comprado)}</span>
        <span>Disponível: {formatMoney(p.total_disponivel)}</span>
        <span>Itens: {p.quantidade_itens}</span>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Watch className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold text-foreground">Pulseiras</h1>
              </div>
            </div>
            <Button size="sm" onClick={() => setAbrirModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Abrir Pulseira
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Busca — só aparece quando não tem detalhe aberto */}
        {!detalhe && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Input placeholder="Buscar por número, nome ou telefone..." value={busca} onChange={e => setBusca(e.target.value)} className="flex-1" />
                <Button variant="outline"><Search className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && <Skeleton className="h-64 w-full" />}

        {/* Detalhe da Pulseira */}
        {detalhe && !loading && (
          <>
            {/* Cabeçalho */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Watch className="h-5 w-5 text-primary" />
                    Pulseira #{detalhe.numero}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={isAtiva ? 'default' : 'secondary'}>{detalhe.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={limpar}><X className="h-4 w-4 mr-1" /> Voltar</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{detalhe.nome_cliente}</div>
                  {detalhe.telefone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{detalhe.telefone}</div>}
                  {detalhe.cpf && <div className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-muted-foreground" />{detalhe.cpf}</div>}
                  <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />Aberta em {formatDate(detalhe.aberta_em)}</div>
                  {detalhe.fechada_em && <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />Fechada em {formatDate(detalhe.fechada_em)}</div>}
                </div>
                {(() => {
                  const temAbate = (detalhe.total_abatido ?? 0) > 0;
                  return (
                    <div className={`grid ${temAbate ? 'grid-cols-4' : 'grid-cols-3'} gap-2 pt-2 text-center`}>
                      <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Comprado</div><div className="font-bold">{formatMoney(detalhe.total_comprado)}</div></div>
                      <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Consumido</div><div className="font-bold">{formatMoney((detalhe.total_consumido ?? 0) + (detalhe.total_baixado ?? 0))}</div></div>
                      {temAbate && <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Abatido</div><div className="font-bold">{formatMoney(detalhe.total_abatido)}</div></div>}
                      <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Disponível</div><div className="font-bold">{formatMoney(detalhe.total_disponivel)}</div></div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Ações */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {isAtiva && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/fichas?pulseira_id=${detalhe.id}&pulseira_numero=${encodeURIComponent(detalhe.numero)}&pulseira_nome=${encodeURIComponent(detalhe.nome_cliente)}`)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Fichas
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAbateModal(true)}><DollarSign className="h-3.5 w-3.5 mr-1" /> Abate de Crédito</Button>
                      <Button size="sm" variant="outline" onClick={() => setHistoricoModal(true)}><History className="h-3.5 w-3.5 mr-1" /> Histórico</Button>
                      <Button size="sm" variant="destructive" onClick={() => fecharPulseira(detalhe.id, { fechada_por: userSession?.access?.user_id, fechada_por_nome: userSession?.access?.nome || userSession?.user?.email || undefined })}>Fechar Pulseira</Button>
                      {!temItens && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmExcluir(true)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir</Button>
                      )}
                    </>
                  )}
                  {isFechada && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setHistoricoModal(true)}><History className="h-3.5 w-3.5 mr-1" /> Histórico</Button>
                      {detalhe.pode_reabrir && <Button size="sm" variant="outline" onClick={() => reabrirPulseira(detalhe.id, { reaberta_por: userSession?.access?.user_id, reaberta_por_nome: userSession?.access?.nome || userSession?.user?.email || undefined })}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir</Button>}
                      {!temItens && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmExcluir(true)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir</Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Saldo por Produto — clicável para baixa */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Saldo por Produto</CardTitle>
                {isAtiva && saldos.length > 0 && <p className="text-xs text-muted-foreground">Clique em um produto para registrar baixa</p>}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Input placeholder="Buscar produto..." value={buscaSaldo} onChange={e => setBuscaSaldo(e.target.value)} className="flex-1" />
                  <Button
                    variant={mostrarTodosSaldos ? 'default' : 'outline'}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setMostrarTodosSaldos(v => !v)}
                  >
                    {mostrarTodosSaldos ? 'Ocultar zerados' : 'Listar todos'}
                  </Button>
                </div>
                {saldoLoading && <Skeleton className="h-20 w-full" />}
                {saldoError && <p className="text-sm text-destructive">{saldoError}</p>}
                {!saldoLoading && !saldoError && filteredSaldos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>}
                {!saldoLoading && filteredSaldos.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Comprado</TableHead>
                          <TableHead className="text-center">Consumido</TableHead>
                          <TableHead className="text-center">Disponível</TableHead>
                          <TableHead className="text-right">Valor Disponível</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSaldos.map((s, i) => (
                          <TableRow
                            key={i}
                            className={isAtiva && (s.quantidade_disponivel ?? 0) > 0 ? 'cursor-pointer hover:bg-muted/60 transition-colors' : ''}
                            onClick={() => {
                              if (isAtiva && (s.quantidade_disponivel ?? 0) > 0) {
                                setBaixaItem(s);
                                setBaixaQtd(1);
                                setBaixaMotivo('');
                              }
                            }}
                          >
                            <TableCell className="font-medium">{s.produto_nome || 'Sem nome'}</TableCell>
                            <TableCell className="text-center">{s.quantidade_comprada ?? 0}</TableCell>
                            <TableCell className="text-center">{(s.quantidade_consumida ?? 0) + (s.quantidade_baixada ?? 0)}</TableCell>
                            <TableCell className="text-center font-bold">{s.quantidade_disponivel ?? 0}</TableCell>
                            <TableCell className="text-right font-bold">{formatMoney(s.valor_disponivel ?? 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Listagem */}
        {!detalhe && !loading && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="abertas" className="flex-1">Abertas ({filtrar(pulseirasAbertas).length})</TabsTrigger>
              <TabsTrigger value="fechadas" className="flex-1">Fechadas ({filtrar(pulseirasFechadas).length})</TabsTrigger>
            </TabsList>
            <TabsContent value="abertas" className="space-y-2 mt-3">
              {filtrar(pulseirasAbertas).length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma pulseira aberta.</p>}
              {filtrar(pulseirasAbertas).map(renderPulseiraCard)}
            </TabsContent>
            <TabsContent value="fechadas" className="space-y-2 mt-3">
              {filtrar(pulseirasFechadas).length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma pulseira fechada.</p>}
              {filtrar(pulseirasFechadas).map(renderPulseiraCard)}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Modal: Abrir Pulseira */}
      <Dialog open={abrirModal} onOpenChange={setAbrirModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Pulseira</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Número *</Label><Input value={fNumero} onChange={e => setFNumero(e.target.value)} placeholder="Ex: 001" /></div>
            <div><Label>Nome do Cliente *</Label><Input value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Nome completo" /></div>
            <div><Label>Telefone</Label><Input value={fTelefone} onChange={e => setFTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
            <div><Label>CPF</Label><Input value={fCpf} onChange={e => setFCpf(e.target.value)} placeholder="000.000.000-00" /></div>
          </div>
          <DialogFooter><Button onClick={handleAbrir}>Abrir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Baixa por Item do Saldo */}
      <Dialog open={!!baixaItem} onOpenChange={(open) => { if (!open) setBaixaItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Baixa</DialogTitle>
            <DialogDescription>
              {baixaItem?.produto_nome || 'Produto'}
            </DialogDescription>
          </DialogHeader>
          {baixaItem && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Quantidade disponível:</span><span className="font-bold">{baixaItem.quantidade_disponivel ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor disponível:</span><span className="font-bold">{formatMoney(baixaItem.valor_disponivel ?? 0)}</span></div>
              </div>
              <div>
                <Label>Quantidade para baixar *</Label>
                <Input
                  type="number"
                  min={1}
                  max={baixaItem.quantidade_disponivel ?? 1}
                  value={baixaQtd}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 1;
                    setBaixaQtd(Math.min(v, baixaItem.quantidade_disponivel ?? 1));
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">A baixa só pode ser dada até a quantidade disponível deste item.</p>
              </div>
              <div>
                <Label>Motivo</Label>
                <Input value={baixaMotivo} onChange={e => setBaixaMotivo(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaItem(null)}>Cancelar</Button>
            <Button onClick={handleBaixaItem}>Confirmar Baixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Abate de Crédito */}
      <Dialog open={abateModal} onOpenChange={setAbateModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abate de Crédito</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Saldo disponível:</span>
              <span className="font-bold">{formatMoney(detalhe?.total_disponivel ?? 0)}</span>
            </div>
            <div><Label>Valor *</Label><Input type="number" step="0.01" min={0} max={detalhe?.total_disponivel ?? 0} value={aValor} onChange={e => setAValor(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Descrição</Label><Input value={aDesc} onChange={e => setADesc(e.target.value)} placeholder="Opcional" /></div>
          </div>
          <DialogFooter><Button onClick={handleAbate}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Histórico */}
      <Dialog open={historicoModal} onOpenChange={setHistoricoModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Histórico da Pulseira</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {historicoLoading && <Skeleton className="h-20 w-full" />}
            {historicoError && <p className="text-sm text-destructive">{historicoError}</p>}
            {!historicoLoading && !historicoError && historico.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro no histórico.</p>
            )}
            {!historicoLoading && historico.length > 0 && (
              <div className="space-y-2">
                {historico.map((h, i) => {
                  const badge = tipoBadge(h.tipo_evento || '');
                  return (
                    <div key={i} className="border-b pb-2 last:border-b-0 text-sm space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                        <span className="text-muted-foreground text-xs">{formatDate(h.data_evento)}</span>
                        {(h.valor ?? 0) > 0 && <span className="text-xs font-medium ml-auto">{formatMoney(h.valor)}</span>}
                      </div>
                      <p>
                        {(() => {
                          const desc = h.descricao_evento || '—';
                          const qty = h.quantidade ?? 0;
                          if (qty > 0) {
                            const prefixMatch = desc.match(/^(.*?:\s*)/);
                            if (prefixMatch) {
                              return `${prefixMatch[1]}${qty} x ${desc.slice(prefixMatch[1].length)}`;
                            }
                            return `${qty} x ${desc}`;
                          }
                          return desc;
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">por {h.usuario_nome || 'Usuário não informado'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoricoModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <ConfirmDialog
        open={confirmExcluir}
        onOpenChange={setConfirmExcluir}
        title="Excluir Pulseira"
        description="Tem certeza que deseja excluir esta pulseira? Esta ação não pode ser desfeita."
        onConfirm={async () => { if (detalhe) await excluirPulseira(detalhe.id, { usuario_id: userSession?.access?.user_id, usuario_nome: userSession?.access?.nome || userSession?.user?.email || undefined }); setConfirmExcluir(false); }}
        confirmText="Sim, excluir"
        cancelText="Cancelar"
      />
    </div>
  );
}
