
# Plano: Adaptação Multiempresa

## Fase 1 — Contexto de Empresa (EmpresaContext)
Criar `src/contexts/EmpresaContext.tsx`:
- Após login, buscar empresas do usuário via `empresa_usuarios` (vinculado por user_id)
- Se 1 empresa → selecionar automaticamente
- Se múltiplas → mostrar seletor de empresa
- Expor `empresaId`, `empresaNome`, `trocarEmpresa()`
- Guardar empresa selecionada no localStorage

## Fase 2 — Helper de queries com empresa_id
Criar hook `useEmpresaDb()` que retorna:
- `empresaId` do contexto
- Funções helper para adicionar `.eq('empresa_id', empresaId)` nas queries

## Fase 3 — Adaptar Hooks (adicionar filtro empresa_id)
Cada hook precisará receber `empresaId` do contexto e:

### Hooks que fazem SELECT (adicionar `.eq('empresa_id', empresaId)`):
1. **useFichasConsumo** — fichas_categorias, fichas_produtos, vw_fichas_ativas, fichas_impressoes, fichas_kits
2. **useVouchers** — vouchers, temp_vouchers
3. **useComandas** — comandas, comanda_itens, comanda_alteracoes
4. **usePulseiras** — vw_pulseiras_resumo, vw_pulseira_saldos, vw_pulseira_historico
5. **useCaixa** — caixas, caixa_movimentacoes, vw_reimpressao_vendas
6. **useKdsOrders** — kds_orders
7. **useFormasPagamento** — formas_pagamento
8. **useImpressoras** — impressoras
9. **useComplementos** — complementos de produtos

### Hooks que fazem INSERT/UPDATE (adicionar `empresa_id` no payload):
- Todos os CRUDs acima nos inserts

### RPCs que precisam de `p_empresa_id`:
- `registrar_impressao_fichas`
- `salvar_kit_com_componentes`
- `abrir_caixa`, `fechar_caixa`, `registrar_sangria_caixa`
- `abrir_pulseira`, `registrar_item_pulseira`, etc.
- `lancar_item_comanda`
- `processar_temp_vouchers_batch`

## Fase 4 — Ajustar páginas/componentes
- `FichasAdmin` — usar empresa_id nas operações
- `FichasLista` — filtrar fichas por empresa
- `VoucherLista` — filtrar vouchers por empresa
- `ComandasLista` — filtrar comandas por empresa
- `KdsPage` — filtrar pedidos por empresa
- `PulseirasPage` — filtrar pulseiras por empresa
- `CaixaPage` — filtrar caixa por empresa
- `AdminSettings` — configurações por empresa
- `ReimpressaoVendas` — filtrar por empresa

## Fase 5 — UX
- Mostrar nome da empresa no header/sidebar
- Seletor de empresa (se múltiplas)
- Tratar erros de acesso negado

## Arquivos a criar:
- `src/contexts/EmpresaContext.tsx`

## Arquivos a modificar:
- `src/App.tsx` (adicionar EmpresaProvider)
- `src/contexts/UserSessionContext.tsx` (carregar empresa após login)
- `src/hooks/useFichasConsumo.ts`
- `src/hooks/useVouchers.ts`
- `src/hooks/useComandas.ts`
- `src/hooks/usePulseiras.ts`
- `src/hooks/useCaixa.ts`
- `src/hooks/useKdsOrders.ts`
- `src/hooks/useFormasPagamento.ts`
- `src/hooks/useImpressoras.ts`
- `src/hooks/useComplementos.ts`
- `src/components/EntradaMercadoriaTab.tsx`
- `src/components/EstoqueTab.tsx`
- `src/components/KitTab.tsx`
- `src/components/ReimpressaoVendas.tsx`
- `src/pages/Index.tsx` (header com nome empresa)
- Demais páginas operacionais
