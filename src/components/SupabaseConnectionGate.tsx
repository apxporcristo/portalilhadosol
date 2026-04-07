import { useState, useEffect, ReactNode } from 'react';
import { supabase as cloudSupabase } from '@/integrations/supabase/client';
import { SupabaseConnectionModal } from '@/components/SupabaseConnectionModal';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export function SupabaseConnectionGate({ children }: Props) {
  const [checking, setChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  const checkConfig = async () => {
    try {
      const { data, error } = await cloudSupabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'default')
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar configuração:', error);
        setIsConfigured(false);
        setChecking(false);
        return;
      }

      if (data?.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (parsed.supabase_url && parsed.supabase_anon_key) {
            setIsConfigured(true);
            setChecking(false);
            return;
          }
        } catch { /* ignore */ }
      }

      setIsConfigured(false);
    } catch {
      setIsConfigured(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConfig();
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <>
        <SupabaseConnectionModal
          open={true}
          onConnected={() => {
            setIsConfigured(true);
            window.location.reload();
          }}
        />
        <div className="flex items-center justify-center min-h-screen text-muted-foreground">
          Configure a conexão com o banco de dados para continuar.
        </div>
      </>
    );
  }

  return <>{children}</>;
}
