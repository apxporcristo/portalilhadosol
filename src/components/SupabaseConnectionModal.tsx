import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface Props {
  open: boolean;
  onConnected: () => void;
}

export function SupabaseConnectionModal({ open, onConnected }: Props) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!url || !anonKey) {
      setStatus('error');
      setMessage('URL e Chave Anon são obrigatórios.');
      return;
    }

    setStatus('testing');
    setMessage('Testando conexão...');

    try {
      const testClient = createClient(url, anonKey);
      const { error } = await testClient.from('user_profiles').select('id').limit(1);

      if (error) {
        setStatus('error');
        setMessage(`Erro: ${error.message}`);
        return;
      }

      setStatus('connected');
      setMessage('Conexão estabelecida com sucesso!');

      setTimeout(() => {
        onConnected();
      }, 1000);
    } catch (e: any) {
      setStatus('error');
      setMessage(`Erro de conexão: ${e.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configurar Banco de Dados
          </DialogTitle>
          <DialogDescription>
            Para usar o sistema, é necessário configurar a conexão com o banco de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-url">URL do Projeto</Label>
            <Input
              id="modal-url"
              type="url"
              placeholder="https://seuproject.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === 'testing'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modal-key">Chave Anon (pública)</Label>
            <Input
              id="modal-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              disabled={status === 'testing'}
            />
          </div>

          {status !== 'idle' && (
            <Alert variant={status === 'error' ? 'destructive' : 'default'}>
              <div className="flex items-center gap-2">
                {status === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === 'connected' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status === 'error' && <XCircle className="h-4 w-4" />}
                <AlertDescription>{message}</AlertDescription>
              </div>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!url || !anonKey || status === 'testing'}
          >
            {status === 'testing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              'Conectar e Salvar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
