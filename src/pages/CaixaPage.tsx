import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingDown, FileText, RefreshCw, Lock, Unlock, Clock, ShoppingCart, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useOptionalUserSession } from '@/contexts/UserSessionContext';
import { useCaixa, VendaDia } from '@/hooks/useCaixa';
import { ReimpressaoVendas } from '@/components/ReimpressaoVendas';
import { ConfirmDialog } from '@/components/ConfirmDialog';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function getOrigemLabel(venda: VendaDia): string {
  if (venda.origem_venda === 'comanda') {
    return venda.comanda_numero ? `Comanda (#${venda.comanda_numero})` : 'Comanda';
  }
  if (venda.origem_venda === 'pulseira') {
    return venda.pulseira_numero ? `Pulseira (#${venda.pulseira_numero})` : 'Pulseira';
  }
  return 'Venda única';
}

function getOrigemColor(origem: string): string {
  if (origem === 'comanda') return 'bg-blue-100 text-blue-800';
  if (origem === 'pulseira') return 'bg-purple-100 text-purple-800';
  return 'bg-green-100 text-green-800';
}

export default function CaixaPage() {
  const navigate = useNavigate();
  const userSession = useOptionalUserSession();
  const caixa = useCaixa();

  const [abrirDialog, setAbrirDialog] = useState(false);
  const [valorAbertura, setValorAbertura] = useState('');
  const [obsAbertura, setObsAbertura] = useState('');

  const [sangriaDialog, setSangriaDialog] = useState(false);
  const [valorSangria, setValorSangria] = useState('');
  const [descSangria, setDescSangria] = useState('');

  const [fecharDialog, setFecharDialog] = useState(false);
  const [obsFechamento, setObsFechamento] = useState('');

  const [relatorioDialog, setRelatorioDialog] = useState(false);

  const userName = userSession?.access?.nome || 'Usuário';
  const hasReimpressao = userSession?.access?.reimpressao_venda ?? false;

  // Group vendas by codigo_venda
  const vendasAgrupadas = useMemo(() => {
    const groups: Record<string, { items: VendaDia[]; total: number; hora: string; origem: string; origemLabel: string }> = {};
    for (const v of caixa.vendasDia) {
      const key = v.codigo_venda || v.id;
      if (!groups[key]) {
        groups[key] = { items: [], total: 0, hora: formatTime(v.data_venda), origem: v.origem_venda, origemLabel: getOrigemLabel(v) };
      }
      groups[key].items.push(v);
      groups[key].total += v.valor_total || 0;
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.hora.localeCompare(a.hora));
  }, [caixa.vendasDia]);

  const saldoAtual = (caixa.caixaAberto?.valor_abertura || 0) + caixa.totalVendidoDia - (caixa.caixaAberto?.total_sangrias || 0);

  const handleAbrirCaixa = async () => {
    try {
      await caixa.abrirCaixa(parseFloat(valorAbertura) || 0, obsAbertura || undefined);
      toast({ title: 'Caixa aberto!', description: 'O caixa foi aberto com sucesso.' });
      setAbrirDialog(false);
      setValorAbertura('');
      setObsAbertura('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao abrir caixa', variant: 'destructive' });
    }
  };

  const handleSangria = async () => {
    const valor = parseFloat(valorSangria);
    if (!valor || valor <= 0) {
      toast({ title: 'Valor inválido', description: 'Informe um valor maior que zero.', variant: 'destructive' });
      return;
    }
    try {
      await caixa.registrarSangria(valor, descSangria || undefined);
      toast({ title: 'Sangria registrada!', description: `Sangria de ${formatCurrency(valor)} registrada.` });
      setSangriaDialog(false);
      setValorSangria('');
      setDescSangria('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao registrar sangria', variant: 'destructive' });
    }
  };

  const handleFecharCaixa = async () => {
    try {
      await caixa.fecharCaixa(obsFechamento || undefined);
      toast({ title: 'Caixa fechado!', description: 'O caixa foi fechado com sucesso.' });
      setFecharDialog(false);
      setObsFechamento('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao fechar caixa', variant: 'destructive' });
    }
  };

  if (caixa.loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Caixa</h1>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={caixa.caixaAberto ? 'default' : 'secondary'}>
              {caixa.caixaAberto ? 'Aberto' : 'Fechado'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={caixa.recarregar}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        {/* Resumo do Caixa */}
        {caixa.caixaAberto ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Banknote className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Abertura</p>
                  <p className="text-lg font-bold">{formatCurrency(caixa.caixaAberto.valor_abertura)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <ShoppingCart className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(caixa.totalVendidoDia)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <TrendingDown className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Sangrias</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(caixa.caixaAberto.total_sangrias)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(saldoAtual)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setSangriaDialog(true)}>
                <TrendingDown className="h-4 w-4 mr-1" /> Sangria
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRelatorioDialog(true)}>
                <FileText className="h-4 w-4 mr-1" /> Relatório
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setFecharDialog(true)}>
                <Lock className="h-4 w-4 mr-1" /> Fechar Caixa
              </Button>
            </div>

            {/* Tabs: Vendas do Dia + Movimentações + Reimpressão */}
            <Tabs defaultValue="vendas" className="w-full">
              <TabsList className="w-full flex">
                <TabsTrigger value="vendas" className="flex-1">Vendas do dia</TabsTrigger>
                <TabsTrigger value="movimentacoes" className="flex-1">Movimentações</TabsTrigger>
                {!hasReimpressao && (
                  <TabsTrigger value="reimpressao" className="flex-1">Reimpressão</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="vendas" className="mt-3 space-y-2">
                {caixa.loadingVendas ? (
                  <Skeleton className="h-20 w-full" />
                ) : vendasAgrupadas.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma venda registrada hoje.</CardContent></Card>
                ) : (
                  vendasAgrupadas.map(([codigo, group]) => (
                    <Card key={codigo}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{codigo}</span>
                            <Badge variant="outline" className={`text-xs ${getOrigemColor(group.origem)}`}>
                              {group.origemLabel}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">{group.hora}</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>{item.quantidade}x {item.produto_nome}</span>
                              <span className="font-medium">{formatCurrency(item.valor_total)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-1 pt-1 border-t text-sm font-bold">
                          <span>{group.items.length} ite{group.items.length > 1 ? 'ns' : 'm'}</span>
                          <span>{formatCurrency(group.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="movimentacoes" className="mt-3 space-y-2">
                {caixa.movimentacoes.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma movimentação.</CardContent></Card>
                ) : (
                  caixa.movimentacoes.map(mov => (
                    <Card key={mov.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="text-xs capitalize">{mov.tipo}</Badge>
                          <p className="text-sm text-muted-foreground mt-0.5">{mov.descricao}</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${mov.tipo === 'sangria' ? 'text-red-600' : ''}`}>
                            {mov.tipo === 'sangria' ? '-' : ''}{formatCurrency(mov.valor)}
                          </span>
                          <p className="text-xs text-muted-foreground">{formatTime(mov.created_at)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {!hasReimpressao && (
                <TabsContent value="reimpressao" className="mt-3">
                  <ReimpressaoVendas />
                </TabsContent>
              )}
            </Tabs>
          </>
        ) : (
          /* Caixa fechado */
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Unlock className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold">Caixa fechado</h2>
                <p className="text-muted-foreground text-sm">Abra o caixa para começar a registrar vendas e movimentações.</p>
              </div>
              <Button onClick={() => setAbrirDialog(true)} size="lg">
                <Unlock className="h-5 w-5 mr-2" /> Abrir Caixa
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog: Abrir Caixa */}
      <Dialog open={abrirDialog} onOpenChange={setAbrirDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>Informe o valor de abertura do caixa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Valor de abertura (R$)</Label>
              <Input type="number" placeholder="0,00" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} min="0" step="0.01" />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea placeholder="Observação..." value={obsAbertura} onChange={e => setObsAbertura(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirDialog(false)}>Cancelar</Button>
            <Button onClick={handleAbrirCaixa}>Abrir Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Sangria */}
      <Dialog open={sangriaDialog} onOpenChange={setSangriaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Sangria</DialogTitle>
            <DialogDescription>Informe o valor e o motivo da sangria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" placeholder="0,00" value={valorSangria} onChange={e => setValorSangria(e.target.value)} min="0" step="0.01" />
            </div>
            <div>
              <Label>Motivo/Descrição</Label>
              <Textarea placeholder="Descreva o motivo..." value={descSangria} onChange={e => setDescSangria(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSangriaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSangria}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fechar Caixa */}
      <ConfirmDialog
        open={fecharDialog}
        onOpenChange={setFecharDialog}
        title="Fechar Caixa"
        description={`Deseja fechar o caixa? Saldo atual: ${formatCurrency(saldoAtual)}`}
        onConfirm={handleFecharCaixa}
        confirmText="Fechar Caixa"
        variant="destructive"
      />

      {/* Dialog: Relatório */}
      <Dialog open={relatorioDialog} onOpenChange={setRelatorioDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório do Caixa</DialogTitle>
            <DialogDescription>{userName} - {new Date().toLocaleDateString('pt-BR')}</DialogDescription>
          </DialogHeader>
          {caixa.caixaAberto && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-2 rounded">
                  <span className="text-muted-foreground">Aberto em</span>
                  <p className="font-medium">{new Date(caixa.caixaAberto.aberto_em).toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-muted p-2 rounded">
                  <span className="text-muted-foreground">Abertura</span>
                  <p className="font-bold">{formatCurrency(caixa.caixaAberto.valor_abertura)}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <span className="text-muted-foreground">Total Vendas</span>
                  <p className="font-bold text-green-600">{formatCurrency(caixa.totalVendidoDia)}</p>
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <span className="text-muted-foreground">Total Sangrias</span>
                  <p className="font-bold text-red-600">{formatCurrency(caixa.caixaAberto.total_sangrias)}</p>
                </div>
              </div>
              <div className="bg-primary/10 p-3 rounded text-center">
                <span className="text-muted-foreground">Saldo Atual</span>
                <p className="text-xl font-bold text-primary">{formatCurrency(saldoAtual)}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Vendas do dia ({vendasAgrupadas.length})</h3>
                {vendasAgrupadas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-2">Nenhuma venda</p>
                ) : (
                  <div className="space-y-1">
                    {vendasAgrupadas.map(([codigo, group]) => (
                      <div key={codigo} className="flex justify-between border-b py-1">
                        <div>
                          <span className="font-mono text-xs">{codigo}</span>
                          <Badge variant="outline" className={`text-xs ml-1 ${getOrigemColor(group.origem)}`}>{group.origemLabel}</Badge>
                        </div>
                        <span className="font-medium">{formatCurrency(group.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Movimentações ({caixa.movimentacoes.length})</h3>
                <div className="space-y-1">
                  {caixa.movimentacoes.map(mov => (
                    <div key={mov.id} className="flex justify-between border-b py-1">
                      <div>
                        <Badge variant="outline" className="text-xs capitalize">{mov.tipo}</Badge>
                        <span className="text-xs ml-1 text-muted-foreground">{mov.descricao}</span>
                      </div>
                      <span className={mov.tipo === 'sangria' ? 'text-red-600 font-medium' : 'font-medium'}>
                        {mov.tipo === 'sangria' ? '-' : ''}{formatCurrency(mov.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelatorioDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
