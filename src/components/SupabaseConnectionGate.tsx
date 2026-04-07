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
      // Test if the current client can reach the DB
      const { error } = await cloudSupabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (!error) {
        setIsConfigured(true);
        setChecking(false);
        return;
      }

      console.error('Erro ao verificar conexão:', error);
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
