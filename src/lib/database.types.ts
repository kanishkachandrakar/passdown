export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      demo_demand: {
        Row: {
          item_name: string
          waiting: number
        }
        Insert: {
          item_name: string
          waiting: number
        }
        Update: {
          item_name?: string
          waiting?: number
        }
        Relationships: []
      }
      handoffs: {
        Row: {
          confirmation_code: string
          created_at: string
          giver_confirmed: boolean
          giver_id: string
          id: string
          item_id: string
          location: string
          receiver_confirmed: boolean
          receiver_id: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["handoff_status"]
        }
        Insert: {
          confirmation_code: string
          created_at?: string
          giver_confirmed?: boolean
          giver_id: string
          id?: string
          item_id: string
          location: string
          receiver_confirmed?: boolean
          receiver_id: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["handoff_status"]
        }
        Update: {
          confirmation_code?: string
          created_at?: string
          giver_confirmed?: boolean
          giver_id?: string
          id?: string
          item_id?: string
          location?: string
          receiver_confirmed?: boolean
          receiver_id?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["handoff_status"]
        }
        Relationships: [
          {
            foreignKeyName: "handoffs_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          available_until: string
          category: string
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          is_free: boolean
          name: string
          owner_id: string
          photo_url: string | null
          pickup_location: string
          price: number
          status: Database["public"]["Enums"]["item_status"]
        }
        Insert: {
          available_until: string
          category: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          is_free?: boolean
          name: string
          owner_id: string
          photo_url?: string | null
          pickup_location: string
          price?: number
          status?: Database["public"]["Enums"]["item_status"]
        }
        Update: {
          available_until?: string
          category?: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          is_free?: boolean
          name?: string
          owner_id?: string
          photo_url?: string | null
          pickup_location?: string
          price?: number
          status?: Database["public"]["Enums"]["item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          item_id: string
          match_score: number
          need_id: string
          reasons: Json
          seen: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          match_score: number
          need_id: string
          reasons?: Json
          seen?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          match_score?: number
          need_id?: string
          reasons?: Json
          seen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "matches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      needs: {
        Row: {
          category: string
          created_at: string
          free_only: boolean
          id: string
          item_name: string
          max_price: number | null
          needed_by: string | null
          preferred_condition:
            | Database["public"]["Enums"]["item_condition"]
            | null
          status: Database["public"]["Enums"]["need_status"]
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          free_only?: boolean
          id?: string
          item_name: string
          max_price?: number | null
          needed_by?: string | null
          preferred_condition?:
            | Database["public"]["Enums"]["item_condition"]
            | null
          status?: Database["public"]["Enums"]["need_status"]
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          free_only?: boolean
          id?: string
          item_name?: string
          max_price?: number | null
          needed_by?: string | null
          preferred_condition?:
            | Database["public"]["Enums"]["item_condition"]
            | null
          status?: Database["public"]["Enums"]["need_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "needs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          campus_area: string | null
          created_at: string
          email: string
          id: string
          institution: string
          missed_pickups: number
          name: string
          successful_handoffs: number
          verified: boolean
        }
        Insert: {
          campus_area?: string | null
          created_at?: string
          email: string
          id: string
          institution: string
          missed_pickups?: number
          name: string
          successful_handoffs?: number
          verified?: boolean
        }
        Update: {
          campus_area?: string | null
          created_at?: string
          email?: string
          id?: string
          institution?: string
          missed_pickups?: number
          name?: string
          successful_handoffs?: number
          verified?: boolean
        }
        Relationships: []
      }
      reservations: {
        Row: {
          claimant_id: string
          created_at: string
          expires_at: string
          id: string
          item_id: string
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          claimant_id: string
          created_at?: string
          expires_at: string
          id?: string
          item_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          claimant_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          item_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reservations_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_handoff: {
        Args: { p_handoff_id: string }
        Returns: {
          confirmation_code: string
          created_at: string
          giver_confirmed: boolean
          giver_id: string
          id: string
          item_id: string
          location: string
          receiver_confirmed: boolean
          receiver_id: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["handoff_status"]
        }
        SetofOptions: {
          from: "*"
          to: "handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_reservation: {
        Args: { p_reservation_id: string }
        Returns: undefined
      }
      claim_item: {
        Args: { p_item_id: string }
        Returns: {
          claimant_id: string
          created_at: string
          expires_at: string
          id: string
          item_id: string
          status: Database["public"]["Enums"]["reservation_status"]
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_claim: {
        Args: { p_reservation_id: string }
        Returns: {
          confirmation_code: string
          created_at: string
          giver_confirmed: boolean
          giver_id: string
          id: string
          item_id: string
          location: string
          receiver_confirmed: boolean
          receiver_id: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["handoff_status"]
        }
        SetofOptions: {
          from: "*"
          to: "handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_handoff: {
        Args: { p_handoff_id: string }
        Returns: {
          confirmation_code: string
          created_at: string
          giver_confirmed: boolean
          giver_id: string
          id: string
          item_id: string
          location: string
          receiver_confirmed: boolean
          receiver_id: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["handoff_status"]
        }
        SetofOptions: {
          from: "*"
          to: "handoffs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_reservations: { Args: never; Returns: number }
      expire_stale_items: { Args: never; Returns: number }
      expire_stale_needs: { Args: never; Returns: number }
      my_institution: { Args: never; Returns: string }
      run_maintenance: { Args: never; Returns: Json }
    }
    Enums: {
      handoff_status: "scheduled" | "completed" | "cancelled"
      item_condition: "new" | "like_new" | "good" | "fair"
      item_status:
        | "available"
        | "reserved"
        | "claimed"
        | "completed"
        | "expired"
      need_status: "open" | "matched" | "fulfilled" | "expired" | "cancelled"
      reservation_status: "active" | "confirmed" | "expired" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      handoff_status: ["scheduled", "completed", "cancelled"],
      item_condition: ["new", "like_new", "good", "fair"],
      item_status: ["available", "reserved", "claimed", "completed", "expired"],
      need_status: ["open", "matched", "fulfilled", "expired", "cancelled"],
      reservation_status: ["active", "confirmed", "expired", "cancelled"],
    },
  },
} as const

