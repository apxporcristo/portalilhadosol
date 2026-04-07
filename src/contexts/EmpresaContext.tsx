import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase-external';
import { useOptionalUserSession } from '@/contexts/UserSessionContext';

export interface Empresa {
  id: string;
  nome: string; // mapped from nome_fantasia
}

interface EmpresaContextType {
  empresa: Empresa | null;
  empresaId: string | null;
  empresas: Empresa[];
  loading: boolean;
  trocarEmpresa: (empresaId: string) => void;
}

const EMPRESA_KEY = 'app-empresa-id';
const EmpresaContext = createContext<EmpresaContextType | null>(null);

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa must be used within EmpresaProvider');
  return ctx;
}

export function useOptionalEmpresa() {
  return useContext(EmpresaContext);
}

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const userSession = useOptionalUserSession();
  const userId = userSession?.user?.id;

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmpresas = useCallback(async (uid: string) => {
    try {
      const db = await getSupabaseClient();

      // Get the real user_id from user_profiles (uid is user_profiles.id, not user_profiles.user_id)
      const { data: profileData } = await db
        .from('user_profiles' as any)
        .select('user_id')
        .eq('id', uid)
        .limit(1);
      
      const realUserId = (profileData && (profileData as any[]).length > 0) 
        ? (profileData as any[])[0].user_id 
        : uid;

      // Verificar se o usuário é admin
      const { data: permData } = await db
        .from('user_permissions' as any)
        .select('is_admin')
        .eq('user_id', realUserId)
        .limit(1);

      const isAdmin = permData && (permData as any[]).length > 0 && (permData as any[])[0].is_admin === true;

      let lista: Empresa[] = [];

      if (isAdmin) {
        // Admin tem acesso a TODAS as empresas
        const { data: empresasData, error: empresaErr } = await db
          .from('empresas' as any)
          .select('id, nome');

        if (empresaErr || !empresasData) {
          console.warn('[Empresa] Erro ao carregar empresas (admin):', empresaErr);
          setEmpresas([]);
          setEmpresa(null);
          setLoading(false);
          return;
        }
        lista = empresasData as Empresa[];
      } else {
        // Usuário normal: buscar apenas empresas vinculadas
        const { data: vinculos, error: vinculoErr } = await db
          .from('empresa_usuarios' as any)
          .select('empresa_id')
          .eq('user_id', realUserId);

        if (vinculoErr || !vinculos || vinculos.length === 0) {
          console.warn('[Empresa] Nenhuma empresa vinculada ao usuário:', realUserId);
          setEmpresas([]);
          setEmpresa(null);
          setLoading(false);
          return;
        }

        const empresaIds = (vinculos as any[]).map(v => v.empresa_id);

        const { data: empresasData, error: empresaErr } = await db
          .from('empresas' as any)
          .select('id, nome')
          .in('id', empresaIds);

        if (empresaErr || !empresasData) {
          console.warn('[Empresa] Erro ao carregar empresas:', empresaErr);
          setEmpresas([]);
          setEmpresa(null);
          setLoading(false);
          return;
        }
        lista = empresasData as Empresa[];
      }

      setEmpresas(lista);

      // Tentar restaurar empresa salva
      const savedId = localStorage.getItem(EMPRESA_KEY);
      const saved = savedId ? lista.find(e => e.id === savedId) : null;

      if (saved) {
        setEmpresa(saved);
      } else if (lista.length >= 1) {
        setEmpresa(lista[0]);
        localStorage.setItem(EMPRESA_KEY, lista[0].id);
      }
    } catch (err) {
      console.error('[Empresa] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadEmpresas(userId);
    } else {
      setEmpresas([]);
      setEmpresa(null);
      setLoading(false);
    }
  }, [userId, loadEmpresas]);

  const trocarEmpresa = useCallback((empresaId: string) => {
    const found = empresas.find(e => e.id === empresaId);
    if (found) {
      setEmpresa(found);
      localStorage.setItem(EMPRESA_KEY, found.id);
    }
  }, [empresas]);

  return (
    <EmpresaContext.Provider value={{
      empresa,
      empresaId: empresa?.id || null,
      empresas,
      loading,
      trocarEmpresa,
    }}>
      {children}
    </EmpresaContext.Provider>
  );
}
