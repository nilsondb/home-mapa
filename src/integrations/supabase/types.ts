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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      medias_periodo: {
        Row: {
          created_at: string
          data: string
          id: string
          media_diastolica: number
          media_pulso: number | null
          media_sistolica: number
          periodo: Database["public"]["Enums"]["periodo_dia"]
          protocolo_id: string | null
          qtd_afericoes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          media_diastolica: number
          media_pulso?: number | null
          media_sistolica: number
          periodo: Database["public"]["Enums"]["periodo_dia"]
          protocolo_id?: string | null
          qtd_afericoes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          media_diastolica?: number
          media_pulso?: number | null
          media_sistolica?: number
          periodo?: Database["public"]["Enums"]["periodo_dia"]
          protocolo_id?: string | null
          qtd_afericoes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medias_periodo_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_paciente: {
        Row: {
          created_at: string
          id: string
          medico_id: string
          paciente_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medico_id: string
          paciente_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medico_id?: string
          paciente_id?: string
        }
        Relationships: []
      }
      medicoes: {
        Row: {
          braco: Database["public"]["Enums"]["braco_medicao"]
          created_at: string
          data: string
          diastolica: number
          hora: string
          id: string
          metadata: Json
          observacao: string | null
          ordem: number
          periodo: Database["public"]["Enums"]["periodo_dia"]
          protocolo_id: string | null
          pulso: number | null
          sistolica: number
          user_id: string
        }
        Insert: {
          braco?: Database["public"]["Enums"]["braco_medicao"]
          created_at?: string
          data?: string
          diastolica: number
          hora?: string
          id?: string
          metadata?: Json
          observacao?: string | null
          ordem?: number
          periodo: Database["public"]["Enums"]["periodo_dia"]
          protocolo_id?: string | null
          pulso?: number | null
          sistolica: number
          user_id: string
        }
        Update: {
          braco?: Database["public"]["Enums"]["braco_medicao"]
          created_at?: string
          data?: string
          diastolica?: number
          hora?: string
          id?: string
          metadata?: Json
          observacao?: string | null
          ordem?: number
          periodo?: Database["public"]["Enums"]["periodo_dia"]
          protocolo_id?: string | null
          pulso?: number | null
          sistolica?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          altura_cm: number | null
          created_at: string
          crm: string | null
          data_nascimento: string | null
          email: string | null
          foto_url: string | null
          id: string
          metadata: Json
          nome: string
          peso_kg: number | null
          sexo: Database["public"]["Enums"]["sexo_tipo"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          created_at?: string
          crm?: string | null
          data_nascimento?: string | null
          email?: string | null
          foto_url?: string | null
          id: string
          metadata?: Json
          nome?: string
          peso_kg?: number | null
          sexo?: Database["public"]["Enums"]["sexo_tipo"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          created_at?: string
          crm?: string | null
          data_nascimento?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          metadata?: Json
          nome?: string
          peso_kg?: number | null
          sexo?: Database["public"]["Enums"]["sexo_tipo"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      protocolos: {
        Row: {
          created_at: string
          data_inicio: string
          duracao_dias: number
          id: string
          metadata: Json
          minimo_dias: number
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_inicio?: string
          duracao_dias?: number
          id?: string
          metadata?: Json
          minimo_dias?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_inicio?: string
          duracao_dias?: number
          id?: string
          metadata?: Json
          minimo_dias?: number
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_medico_de: {
        Args: { _medico: string; _paciente: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "paciente" | "medico" | "admin"
      braco_medicao: "direito" | "esquerdo"
      periodo_dia: "manha" | "noite"
      sexo_tipo: "masculino" | "feminino" | "outro" | "nao_informado"
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
    Enums: {
      app_role: ["paciente", "medico", "admin"],
      braco_medicao: ["direito", "esquerdo"],
      periodo_dia: ["manha", "noite"],
      sexo_tipo: ["masculino", "feminino", "outro", "nao_informado"],
    },
  },
} as const
