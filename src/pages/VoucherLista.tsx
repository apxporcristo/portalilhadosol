import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Plus, ShoppingCart, X } from 'lucide-react';
import { useVouchers } from '@/hooks/useVouchers';
import { usePrinterContext } from '@/contexts/PrinterContext';
import { useVoucherCart } from '@/hooks/useVoucherCart';

import { VoucherCart } from '@/components/VoucherCart';
import { VoucherViewDialog } from '@/components/VoucherViewDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useOptionalUserSession } from '@/contexts/UserSessionContext';

const timeColors: Record<string, string> = {
  '1 Hora': 'bg-time-1h hover:bg-time-1h/90',
  '2 Horas': 'bg-time-2h hover:bg-time-2h/90',
  '3 Horas': 'bg-time-3h hover:bg-time-3h/90',
  '4 Horas': 'bg-time-4h hover:bg-time-4h/90',
  '5 Horas': 'bg-time-5h hover:bg-time-5h/90',
  '6 Horas': 'bg-time-6h hover:bg-time-6h/90',
};

export default function VoucherLista() {
  const navigate = useNavigate();
  const sessionCtx = useOptionalUserSession();
  const userAccess = sessionCtx?.access;
  const isSpecificTempo = !!(userAccess?.acesso_voucher && userAccess?.voucher_tempo_acesso);
  const allowedTempo = userAccess?.voucher_tempo_acesso || null;

  const {
    stats, loading,
    getFreVouchersBatch, markVouchersPreReservado,
  } = useVouchers();

  const { createVoucherData, ensureBluetoothConnected, writeToCharacteristic } = usePrinterContext();
  const cart = useVoucherCart();

  const [batchPrinting, setBatchPrinting] = useState(false);
  const [viewVouchers, setViewVouchers] = useState<{ voucher_id: string; tempo_validade: string }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [flyAnim, setFlyAnim] = useState<{ id: string; x: number; y: number } | null>(null);

  const triggerFlyAnimation = (tempo: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyAnim({ id: tempo, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setTimeout(() => setFlyAnim(null), 600);
  };

  const handleAddToCart = useCallback((tempo: string, e?: React.MouseEvent) => {
    const inCart = cart.items.find(i => i.tempo === tempo)?.quantity || 0;
    const available = stats.livresPorTempo[tempo] || 0;
    if (inCart >= available) {
      toast({ title: 'Limite atingido', description: `Todos os ${available} voucher(s) de ${tempo} já estão no carrinho.` });
      return;
    }
    cart.addItem(tempo);
  }, [cart, stats.livresPorTempo]);

  const handleBatchPrint = useCallback(async () => {
    setBatchPrinting(true);
    try {
      const voucherItems = cart.items;
      const selectedVouchers = voucherItems.length > 0 ? getFreVouchersBatch(voucherItems) : [];
      if (selectedVouchers.length === 0) { setBatchPrinting(false); return; }

      const characteristic = await ensureBluetoothConnected();
      if (!characteristic) {
        toast({ title: 'Impressora não conectada', description: 'Não foi possível conectar à impressora Bluetooth.', variant: 'destructive' });
        setBatchPrinting(false);
        return;
      }

      for (const v of selectedVouchers) {
        const escposData = await createVoucherData(v.voucher_id, v.tempo_validade);
        await writeToCharacteristic(characteristic, escposData);
      }

      await markVouchersPreReservado(selectedVouchers.map(v => v.voucher_id));
      toast({ title: 'Impresso!', description: `${selectedVouchers.length} voucher(s) impresso(s) com sucesso.` });
      cart.clearCart();
      setShowCart(false);
    } catch (error) {
      console.error('Erro na impressão em lote:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro durante a impressão.', variant: 'destructive' });
    } finally {
      setBatchPrinting(false);
    }
  }, [cart, getFreVouchersBatch, markVouchersPreReservado, createVoucherData, ensureBluetoothConnected, writeToCharacteristic]);

  const handleViewVoucher = useCallback(async () => {
    setBatchPrinting(true);
    try {
      const voucherItems = cart.items;
      const selectedVouchers = voucherItems.length > 0 ? getFreVouchersBatch(voucherItems) : [];
      if (selectedVouchers.length === 0) { setBatchPrinting(false); return; }
      setViewVouchers(selectedVouchers.map(v => ({ voucher_id: v.voucher_id, tempo_validade: v.tempo_validade })));
    } catch (error) {
      console.error('Erro ao visualizar vouchers:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao gerar os vouchers.', variant: 'destructive' });
    } finally {
      setBatchPrinting(false);
    }
  }, [cart, getFreVouchersBatch]);

  const handleConfirmViewVouchers = useCallback(async () => {
    setBatchPrinting(true);
    try {
      const ids = viewVouchers.map(v => v.voucher_id);
      if (ids.length > 0) await markVouchersPreReservado(ids);
      toast({ title: 'Vouchers confirmados!', description: `${ids.length} voucher(s) marcados como pré-reservado.` });
      cart.clearCart();
      setViewVouchers([]);
      setShowCart(false);
    } catch (error) {
      console.error('Erro ao confirmar vouchers:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao confirmar os vouchers.', variant: 'destructive' });
    } finally {
      setBatchPrinting(false);
    }
  }, [viewVouchers, markVouchersPreReservado, cart]);

  const temposComVouchersLivres = stats.temposDisponiveis.filter(
    tempo => {
      if ((stats.livresPorTempo[tempo] || 0) <= 0) return false;
      if (isSpecificTempo && tempo !== allowedTempo) return false;
      return true;
    }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Lista de Vouchers</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <Alert variant="default" className="border">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            {isSpecificTempo
              ? `Selecione vouchers de ${allowedTempo} e visualize na tela`
              : 'Selecione os vouchers desejados e imprima todos de uma vez'}
          </AlertDescription>
        </Alert>

        {temposComVouchersLivres.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {temposComVouchersLivres.map((tempo) => {
              const available = stats.livresPorTempo[tempo] || 0;
              const inCart = cart.items.find(i => i.tempo === tempo)?.quantity || 0;
              const colorClass = timeColors[tempo] || 'bg-primary hover:bg-primary/90';
              return (
                <Button key={tempo} onClick={(e) => { triggerFlyAnimation(tempo, e); handleAddToCart(tempo, e); }} disabled={batchPrinting || inCart >= available}
                  className={cn('flex flex-col items-center justify-center h-32 w-full rounded-xl text-primary-foreground shadow-lg transition-all duration-300 transform hover:scale-105 relative', colorClass)}>
                  {inCart > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-sm px-2">{inCart}</Badge>
                  )}
                  <span className="text-xl font-bold mb-1">{tempo}</span>
                  <span className="text-sm opacity-90">{available} disponíveis</span>
                  <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
                    <Plus className="h-4 w-4" /><span>Adicionar</span>
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          <Alert className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Nenhum voucher disponível no momento.</AlertDescription>
          </Alert>
        )}
      </main>

      {/* Floating cart button - bottom right */}
      {cart.totalItems > 0 && !showCart && (
        <button
          id="voucher-cart-icon-btn"
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-30 bg-primary text-primary-foreground rounded-full h-14 w-14 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
            {cart.totalItems}
          </span>
        </button>
      )}

      {/* Cart panel - slides up from bottom right */}
      {showCart && cart.totalItems > 0 && (
        <div className="fixed bottom-6 right-6 z-30 w-[90vw] max-w-md animate-scale-in">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 z-10 bg-card border rounded-full h-8 w-8 shadow-md"
              onClick={() => setShowCart(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <VoucherCart
              items={cart.items}
              onAdd={(tempo, opts) => cart.addItem(tempo, opts)}
              onRemove={(tempo, fichaType) => cart.removeItem(tempo, fichaType)}
              onRemoveAll={(tempo, fichaType) => cart.removeAll(tempo, fichaType)}
              onClear={() => { cart.clearCart(); setShowCart(false); }}
              onPrint={isSpecificTempo ? handleViewVoucher : handleBatchPrint}
              totalItems={cart.totalItems}
              printing={batchPrinting}
              availableByTempo={stats.livresPorTempo}
              viewMode={isSpecificTempo}
            />
          </div>
        </div>
      )}

      {/* Fly to cart animation */}
      {flyAnim && (() => {
        const targetX = window.innerWidth - 40;
        const targetY = window.innerHeight - 40;
        return (
          <div
            key={flyAnim.id + '-' + Date.now()}
            className="fixed z-[100] pointer-events-none"
            style={{
              left: flyAnim.x,
              top: flyAnim.y,
              animation: 'fly-to-cart 0.5s ease-in forwards',
              '--fly-tx': `${targetX - flyAnim.x}px`,
              '--fly-ty': `${targetY - flyAnim.y}px`,
            } as React.CSSProperties}
          >
            <div className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
        );
      })()}

      <VoucherViewDialog
        open={viewVouchers.length > 0}
        onOpenChange={(open) => { if (!open) setViewVouchers([]); }}
        vouchers={viewVouchers}
        onConfirm={handleConfirmViewVouchers}
        confirming={batchPrinting}
      />
    </div>
  );
}