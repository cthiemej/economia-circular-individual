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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      decisions: {
        Row: {
          cards: Json
          confirmed_at: string | null
          education_spend: number
          evaluation_id: string
          practices: number[]
          saved_at: string | null
          saved_by: string | null
          training_spend: number
          year: number
        }
        Insert: {
          cards?: Json
          confirmed_at?: string | null
          education_spend?: number
          evaluation_id: string
          practices?: number[]
          saved_at?: string | null
          saved_by?: string | null
          training_spend?: number
          year: number
        }
        Update: {
          cards?: Json
          confirmed_at?: string | null
          education_spend?: number
          evaluation_id?: string
          practices?: number[]
          saved_at?: string | null
          saved_by?: string | null
          training_spend?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "decisions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          confirmed_at: string | null
          evaluation_id: string
          gaps: Json
          saved_at: string | null
          saved_by: string | null
        }
        Insert: {
          confirmed_at?: string | null
          evaluation_id: string
          gaps?: Json
          saved_at?: string | null
          saved_by?: string | null
        }
        Update: {
          confirmed_at?: string | null
          evaluation_id?: string
          gaps?: Json
          saved_at?: string | null
          saved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          focal: string
          horizon: number
          id: string
          name: string
          params: Json
          projection: boolean
          rebound: boolean
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          focal?: string
          horizon?: number
          id?: string
          name: string
          params?: Json
          projection?: boolean
          rebound?: boolean
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          focal?: string
          horizon?: number
          id?: string
          name?: string
          params?: Json
          projection?: boolean
          rebound?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      regulatory_maps: {
        Row: {
          answers: Json
          confirmed_at: string | null
          evaluation_id: string
          saved_at: string | null
          saved_by: string | null
        }
        Insert: {
          answers?: Json
          confirmed_at?: string | null
          evaluation_id: string
          saved_at?: string | null
          saved_by?: string | null
        }
        Update: {
          answers?: Json
          confirmed_at?: string | null
          evaluation_id?: string
          saved_at?: string | null
          saved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_maps_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_declarations: {
        Row: {
          cost_uf: number
          evaluation_id: string
          obligation: Json
          saved_at: string | null
          saved_by: string | null
          tonnes: Json
          year: number
        }
        Insert: {
          cost_uf: number
          evaluation_id: string
          obligation: Json
          saved_at?: string | null
          saved_by?: string | null
          tonnes: Json
          year: number
        }
        Update: {
          cost_uf?: number
          evaluation_id?: string
          obligation?: Json
          saved_at?: string | null
          saved_by?: string | null
          tonnes?: Json
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rep_declarations_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      year_results: {
        Row: {
          evaluation_id: string
          is_projection: boolean
          processed_at: string
          result: Json
          year: number
        }
        Insert: {
          evaluation_id: string
          is_projection?: boolean
          processed_at?: string
          result: Json
          year: number
        }
        Update: {
          evaluation_id?: string
          is_projection?: boolean
          processed_at?: string
          result?: Json
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "year_results_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      eval_stage_open: {
        Args: { p_evaluation: string; p_stage: number }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_owner: { Args: { p_evaluation: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "client"],
    },
  },
} as const
