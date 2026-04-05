export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      caixa_movimentacoes: {
        Row: {
          caixa_id: string
          created_at: string
          descricao: string | null
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          caixa_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo: string
          valor?: number
        }
        Update: {
          caixa_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentacoes_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
        ]
      }
      caixas: {
        Row: {
          aberto_em: string
          created_at: string
          fechado_em: string | null
          id: string
          observacao: string | null
          status: string
          total_sangrias: number
          total_vendas: number
          usuario_id: string
          usuario_nome: string
          valor_abertura: number
        }
        Insert: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          id?: string
          observacao?: string | null
          status?: string
          total_sangrias?: number
          total_vendas?: number
          usuario_id: string
          usuario_nome?: string
          valor_abertura?: number
        }
        Update: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          id?: string
          observacao?: string | null
          status?: string
          total_sangrias?: number
          total_vendas?: number
          usuario_id?: string
          usuario_nome?: string
          valor_abertura?: number
        }
        Relationships: []
      }
      entradas_mercadoria: {
        Row: {
          created_at: string
          data_compra: string
          id: string
          numero_nota: string
          observacao: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string
          data_compra: string
          id?: string
          numero_nota: string
          observacao?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string
          data_compra?: string
          id?: string
          numero_nota?: string
          observacao?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      entradas_mercadoria_itens: {
        Row: {
          created_at: string
          entrada_id: string
          id: string
          margem_lucro: number
          produto_id: string
          produto_nome: string
          quantidade: number
          valor_comprado: number
          valor_total_comprado: number
          valor_total_venda: number
          valor_venda: number
        }
        Insert: {
          created_at?: string
          entrada_id: string
          id?: string
          margem_lucro?: number
          produto_id: string
          produto_nome: string
          quantidade?: number
          valor_comprado?: number
          valor_total_comprado?: number
          valor_total_venda?: number
          valor_venda?: number
        }
        Update: {
          created_at?: string
          entrada_id?: string
          id?: string
          margem_lucro?: number
          produto_id?: string
          produto_nome?: string
          quantidade?: number
          valor_comprado?: number
          valor_total_comprado?: number
          valor_total_venda?: number
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "entradas_mercadoria_itens_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas_mercadoria"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          exigir_dados_atendente: boolean
          exigir_dados_cliente: boolean
          id: string
          nome_categoria: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          exigir_dados_atendente?: boolean
          exigir_dados_cliente?: boolean
          id?: string
          nome_categoria: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          exigir_dados_atendente?: boolean
          exigir_dados_cliente?: boolean
          id?: string
          nome_categoria?: string
          updated_at?: string
        }
        Relationships: []
      }
      fichas_impressas: {
        Row: {
          categoria_id: string
          categoria_nome: string
          codigo_venda: string | null
          comanda_id: string | null
          comanda_numero: string | null
          created_at: string
          id: string
          nome_atendente: string | null
          nome_cliente: string | null
          produto_id: string
          produto_nome: string
          pulseira_id: string | null
          pulseira_numero: string | null
          quantidade: number
          telefone_cliente: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          categoria_id: string
          categoria_nome: string
          codigo_venda?: string | null
          comanda_id?: string | null
          comanda_numero?: string | null
          created_at?: string
          id?: string
          nome_atendente?: string | null
          nome_cliente?: string | null
          produto_id: string
          produto_nome: string
          pulseira_id?: string | null
          pulseira_numero?: string | null
          quantidade?: number
          telefone_cliente?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          categoria_id?: string
          categoria_nome?: string
          codigo_venda?: string | null
          comanda_id?: string | null
          comanda_numero?: string | null
          created_at?: string
          id?: string
          nome_atendente?: string | null
          nome_cliente?: string | null
          produto_id?: string
          produto_nome?: string
          pulseira_id?: string | null
          pulseira_numero?: string | null
          quantidade?: number
          telefone_cliente?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "fichas_impressas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "fichas_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_impressas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "fichas_impressas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_fichas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_impressoes: {
        Row: {
          codigo_atendente: string | null
          created_at: string
          documento_cliente: string | null
          forma_pagamento_id: string | null
          forma_pagamento_nome: string | null
          id: string
          nome_atendente: string | null
          nome_cliente: string | null
          produto_id: string
          quantidade: number
          telefone_cliente: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo_atendente?: string | null
          created_at?: string
          documento_cliente?: string | null
          forma_pagamento_id?: string | null
          forma_pagamento_nome?: string | null
          id?: string
          nome_atendente?: string | null
          nome_cliente?: string | null
          produto_id: string
          quantidade?: number
          telefone_cliente?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          codigo_atendente?: string | null
          created_at?: string
          documento_cliente?: string | null
          forma_pagamento_id?: string | null
          forma_pagamento_nome?: string | null
          id?: string
          nome_atendente?: string | null
          nome_cliente?: string | null
          produto_id?: string
          quantidade?: number
          telefone_cliente?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "fichas_impressoes_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_impressoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "fichas_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_impressoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "fichas_impressoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_fichas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_kit_itens: {
        Row: {
          created_at: string
          id: string
          kit_id: string
          produto_componente_id: string
          quantidade_baixa: number
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id: string
          produto_componente_id: string
          quantidade_baixa?: number
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string
          produto_componente_id?: string
          quantidade_baixa?: number
        }
        Relationships: [
          {
            foreignKeyName: "fichas_kit_itens_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "fichas_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_kits: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          id: string
          nome_kit: string
          observacao: string | null
          produto_principal_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          id?: string
          nome_kit?: string
          observacao?: string | null
          produto_principal_id?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          id?: string
          nome_kit?: string
          observacao?: string | null
          produto_principal_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      fichas_produtos: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          estoque_negativo: boolean
          forma_venda: string
          id: string
          kit: boolean
          nome_produto: string
          obs: string | null
          printer_id: string | null
          quantidade_a_baixar: number
          tem_complementos: boolean
          updated_at: string
          valor: number
          valor_por_kg: number
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          estoque_negativo?: boolean
          forma_venda?: string
          id?: string
          kit?: boolean
          nome_produto: string
          obs?: string | null
          printer_id?: string | null
          quantidade_a_baixar?: number
          tem_complementos?: boolean
          updated_at?: string
          valor?: number
          valor_por_kg?: number
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          estoque_negativo?: boolean
          forma_venda?: string
          id?: string
          kit?: boolean
          nome_produto?: string
          obs?: string | null
          printer_id?: string | null
          quantidade_a_baixar?: number
          tem_complementos?: boolean
          updated_at?: string
          valor?: number
          valor_por_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "fichas_produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "fichas_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_produtos_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "impressoras"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean
          created_at: string | null
          exibir_troco: boolean
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          exibir_troco?: boolean
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          exibir_troco?: boolean
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      impressoras: {
        Row: {
          ativa: boolean
          bluetooth_mac: string | null
          bluetooth_nome: string | null
          created_at: string | null
          descricao: string | null
          id: string
          ip: string | null
          nome: string
          padrao: boolean
          porta: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean
          bluetooth_mac?: string | null
          bluetooth_nome?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ip?: string | null
          nome: string
          padrao?: boolean
          porta?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean
          bluetooth_mac?: string | null
          bluetooth_nome?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ip?: string | null
          nome?: string
          padrao?: boolean
          porta?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pacotes: {
        Row: {
          created_at: string
          id: string
          tempo_validade: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          tempo_validade: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          tempo_validade?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      temp_vouchers: {
        Row: {
          created_at: string
          data_uso: string | null
          id: string
          status: string
          tempo_validade: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          data_uso?: string | null
          id?: string
          status?: string
          tempo_validade: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          data_uso?: string | null
          id?: string
          status?: string
          tempo_validade?: string
          voucher_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          acesso_cadastrar_produto: boolean | null
          acesso_ficha_consumo: boolean | null
          acesso_voucher: boolean | null
          created_at: string | null
          id: string
          is_admin: boolean | null
          user_id: string
        }
        Insert: {
          acesso_cadastrar_produto?: boolean | null
          acesso_ficha_consumo?: boolean | null
          acesso_voucher?: boolean | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          user_id: string
        }
        Update: {
          acesso_cadastrar_produto?: boolean | null
          acesso_ficha_consumo?: boolean | null
          acesso_voucher?: boolean | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          created_at: string
          data_uso: string | null
          id: string
          status: string
          tempo_validade: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          data_uso?: string | null
          id?: string
          status?: string
          tempo_validade: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          data_uso?: string | null
          id?: string
          status?: string
          tempo_validade?: string
          voucher_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_estoque: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          estoque_atual: number | null
          estoque_negativo: boolean | null
          kit: boolean | null
          nome_categoria: string | null
          nome_produto: string | null
          produto_id: string | null
          quantidade_a_baixar: number | null
          quantidade_comprada: number | null
          quantidade_consumida_kit: number | null
          quantidade_vendida: number | null
          quantidade_vendida_direta: number | null
          ultimo_valor_comprado: number | null
          ultimo_valor_venda: number | null
          valor_venda_atual: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "fichas_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fichas_ativas: {
        Row: {
          categoria_id: string | null
          categoria_nome: string | null
          created_at: string | null
          exigir_dados_atendente: boolean | null
          exigir_dados_cliente: boolean | null
          id: string | null
          nome_produto: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "fichas_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fichas_itens_venda: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          created_at: string | null
          exigir_dados_atendente: boolean | null
          exigir_dados_cliente: boolean | null
          forma_venda: string | null
          id: string | null
          nome_categoria: string | null
          nome_item: string | null
          observacao: string | null
          printer_id: string | null
          produto_principal_id: string | null
          tipo_item: string | null
          updated_at: string | null
          valor: number | null
          valor_por_kg: number | null
        }
        Relationships: []
      }
      vw_meu_acesso: {
        Row: {
          acesso_cadastrar_produto: boolean | null
          acesso_ficha_consumo: boolean | null
          acesso_voucher: boolean | null
          email: string | null
          is_admin: boolean | null
          nome: string | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_reimpressao_vendas: {
        Row: {
          categoria_id: string | null
          categoria_nome: string | null
          codigo_venda: string | null
          comanda_id: string | null
          comanda_numero: string | null
          data_venda: string | null
          id: string | null
          nome_atendente: string | null
          nome_cliente: string | null
          origem_venda: string | null
          produto_id: string | null
          produto_nome: string | null
          pulseira_id: string | null
          pulseira_numero: string | null
          quantidade: number | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          categoria_id?: string | null
          categoria_nome?: string | null
          codigo_venda?: never
          comanda_id?: string | null
          comanda_numero?: string | null
          data_venda?: string | null
          id?: string | null
          nome_atendente?: string | null
          nome_cliente?: string | null
          origem_venda?: never
          produto_id?: string | null
          produto_nome?: string | null
          pulseira_id?: string | null
          pulseira_numero?: string | null
          quantidade?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          categoria_id?: string | null
          categoria_nome?: string | null
          codigo_venda?: never
          comanda_id?: string | null
          comanda_numero?: string | null
          data_venda?: string | null
          id?: string | null
          nome_atendente?: string | null
          nome_cliente?: string | null
          origem_venda?: never
          produto_id?: string | null
          produto_nome?: string | null
          pulseira_id?: string | null
          pulseira_numero?: string | null
          quantidade?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_impressas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "fichas_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_impressas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "fichas_impressas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_fichas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abrir_caixa: {
        Args: {
          p_observacao?: string
          p_usuario_id: string
          p_usuario_nome: string
          p_valor_abertura?: number
        }
        Returns: string
      }
      fechar_caixa: {
        Args: { p_observacao?: string; p_usuario_id: string }
        Returns: string
      }
      registrar_impressao_fichas:
        | {
            Args: {
              p_produto_id: string
              p_quantidade: number
              p_valor_unitario: number
            }
            Returns: string
          }
        | {
            Args: {
              p_codigo_atendente?: string
              p_documento_cliente?: string
              p_nome_atendente?: string
              p_nome_cliente?: string
              p_produto_id: string
              p_quantidade: number
              p_telefone_cliente?: string
              p_valor_unitario: number
            }
            Returns: string
          }
      registrar_sangria_caixa: {
        Args: { p_descricao?: string; p_usuario_id: string; p_valor: number }
        Returns: string
      }
      salvar_kit_com_componentes: {
        Args: {
          p_ativo?: boolean
          p_categoria_id?: string
          p_componentes?: Json
          p_kit_id?: string
          p_nome_kit?: string
          p_observacao?: string
          p_valor?: number
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
