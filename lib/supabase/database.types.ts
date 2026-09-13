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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          amount_minor: number
          booking_access_token_hash: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          consent_version: string | null
          consented_at: string | null
          country_code: string | null
          created_at: string
          currency: string
          email: string | null
          hold_expires_at: string | null
          hold_idempotency_key: string | null
          id: string
          phone: string | null
          slot_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          amount_minor: number
          booking_access_token_hash?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          consent_version?: string | null
          consented_at?: string | null
          country_code?: string | null
          created_at?: string
          currency: string
          email?: string | null
          hold_expires_at?: string | null
          hold_idempotency_key?: string | null
          id?: string
          phone?: string | null
          slot_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          booking_access_token_hash?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          consent_version?: string | null
          consented_at?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          hold_expires_at?: string | null
          hold_idempotency_key?: string | null
          id?: string
          phone?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: { amount_minor: number; appointment_id: string; attempt_no: number; created_at: string; currency: string; external_reference: string; id: string; idempotency_key: string; processing_started_at: string | null; provider: string; provider_order_id: string | null; provider_payment_id: string | null; provider_updated_at: string | null; status: Database["public"]["Enums"]["payment_status"]; status_detail: string | null; updated_at: string }
        Insert: { amount_minor: number; appointment_id: string; attempt_no: number; created_at?: string; currency: string; external_reference: string; id?: string; idempotency_key: string; processing_started_at?: string | null; provider?: string; provider_order_id?: string | null; provider_payment_id?: string | null; provider_updated_at?: string | null; status?: Database["public"]["Enums"]["payment_status"]; status_detail?: string | null; updated_at?: string }
        Update: { amount_minor?: number; appointment_id?: string; attempt_no?: number; created_at?: string; currency?: string; external_reference?: string; id?: string; idempotency_key?: string; processing_started_at?: string | null; provider?: string; provider_order_id?: string | null; provider_payment_id?: string | null; provider_updated_at?: string | null; status?: Database["public"]["Enums"]["payment_status"]; status_detail?: string | null; updated_at?: string }
        Relationships: [{ foreignKeyName: "payments_appointment_id_fkey"; columns: ["appointment_id"]; isOneToOne: false; referencedRelation: "appointments"; referencedColumns: ["id"] }]
      }
      slots: {
        Row: {
          availability_status: Database["public"]["Enums"]["slot_availability_status"]
          created_at: string
          ends_at: string
          id: string
          starts_at: string
          timezone: string
          updated_at: string
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["slot_availability_status"]
          created_at?: string
          ends_at: string
          id?: string
          starts_at: string
          timezone: string
          updated_at?: string
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["slot_availability_status"]
          created_at?: string
          ends_at?: string
          id?: string
          starts_at?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_booking_hold: {
        Args: {
          p_booking_access_token_hash: string
          p_idempotency_key: string
          p_slot_id: string
        }
        Returns: {
          appointment_id: string | null
          hold_expires_at: string | null
          replayed: boolean
          result_code: string | null
          result_status: string
          slot_id: string
        }[]
      }
      begin_payment_attempt: {
        Args: { p_booking_access_token_hash: string; p_requested_idempotency_key: string }
        Returns: { amount_minor: number | null; currency: string | null; external_reference: string | null; payer_email: string | null; payment_id: string | null; payment_status: Database["public"]["Enums"]["payment_status"] | null; provider_idempotency_key: string | null; result_code: string | null; result_status: string; should_submit: boolean }[]
      }
      finish_payment_attempt: {
        Args: { p_booking_access_token_hash: string; p_payment_id: string; p_provider_order_id: string | null; p_provider_payment_id: string | null; p_status: Database["public"]["Enums"]["payment_status"]; p_status_detail: string | null }
        Returns: undefined
      }
      save_booking_contact: {
        Args: {
          p_booking_access_token_hash: string
          p_consent_version: string
          p_country_code: string
          p_email: string
          p_phone: string
        }
        Returns: {
          appointment_id: string | null
          hold_expires_at: string | null
          result_code: string | null
          result_status: string
        }[]
      }
    }
    Enums: {
      appointment_status:
        | "held"
        | "payment_pending"
        | "confirmed"
        | "expired"
        | "cancelled"
      payment_status: "created" | "submitting" | "uncertain" | "processing" | "pending" | "approved_provisional" | "rejected"
      slot_availability_status: "open" | "blocked" | "cancelled"
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
      appointment_status: [
        "held",
        "payment_pending",
        "confirmed",
        "expired",
        "cancelled",
      ],
      payment_status: ["created", "submitting", "uncertain", "processing", "pending", "approved_provisional", "rejected"],
      slot_availability_status: ["open", "blocked", "cancelled"],
    },
  },
} as const
