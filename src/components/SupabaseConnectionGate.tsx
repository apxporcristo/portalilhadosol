import { useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
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
      const { data, error } = await (cloudSupabase
        .from('app_settings' as any)
        .select('key, value')
        .eq('key', 'default')
        .maybeSingle() as any);

      if (error || !data?.value) {
        setIsConfigured(false);
        return;
      }

      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (!parsed?.supabase_url || !parsed?.supabase_anon_key) {
        setIsConfigured(false);
        return;
      }

      const testClient = createClient(parsed.supabase_url, parsed.supabase_anon_key);
      const { error: testError } = await testClient
        .from('user_profiles')
        .select('id')
        .limit(1);

      setIsConfigured(!testError);
      if (testError) {
        console.error('Erro ao verificar conexão externa:', testError);
      }
    } catch (error) {
      console.error('Erro ao validar configuração global:', error);
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
