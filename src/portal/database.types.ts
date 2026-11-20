export type AppLocale = "en" | "zh"

export type OrderStatus =
  | "waiting_assets"
  | "producing"
  | "waiting_confirm"
  | "revision"
  | "approved"
  | "completed"

export type VideoVersionType = "preview" | "final"
export type MessageSenderSide = "client" | "studio"
export type PaymentMethodType = "card" | "apple" | "ach"
export type CreditLedgerReason =
  "purchase" | "delivery_deduct" | "admin_adjust" | "refund"
export type QuoteStatus = "open" | "paid" | "expired" | "cancelled"
export type AttachmentStatus = "pending" | "ready" | "failed"
export type ReviewAction = "approved" | "revision_requested"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          company: string
          avatar_url: string | null
          preferred_locale: AppLocale
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          company?: string
          avatar_url?: string | null
          preferred_locale?: AppLocale
        }
        Update: {
          email?: string
          full_name?: string
          company?: string
          avatar_url?: string | null
          preferred_locale?: AppLocale
        }
        Relationships: []
      }
      team_roles: {
        Row: {
          id: string
          name_zh: string
          name_en: string
          description_zh: string
          description_en: string
          locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name_zh: string
          name_en: string
          description_zh?: string
          description_en?: string
          locked?: boolean
        }
        Update: {
          name_zh?: string
          name_en?: string
          description_zh?: string
          description_en?: string
          locked?: boolean
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_key: string
          created_at: string
        }
        Insert: {
          role_id: string
          permission_key: string
        }
        Update: {
          role_id?: string
          permission_key?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          role_id: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          role_id: string
          active?: boolean
        }
        Update: {
          user_id?: string | null
          name?: string
          email?: string
          role_id?: string
          active?: boolean
        }
        Relationships: []
      }
      presenter_profiles: {
        Row: {
          id: string
          client_id: string
          name: string
          notes: string
          headshot_r2_key: string | null
          voice_sample_r2_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          notes?: string
          headshot_r2_key?: string | null
          voice_sample_r2_key?: string | null
        }
        Update: {
          name?: string
          notes?: string
          headshot_r2_key?: string | null
          voice_sample_r2_key?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name_zh: string
          name_en: string
          tag_zh: string
          tag_en: string
          video_count: number
          price_cents: number
          original_price_cents: number | null
          is_published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          id: string
          name_zh: string
          name_en: string
          tag_zh?: string
          tag_en?: string
          video_count: number
          price_cents: number
          original_price_cents?: number | null
          is_published?: boolean
          sort_order?: number
        }
        Update: {
          name_zh?: string
          name_en?: string
          tag_zh?: string
          tag_en?: string
          video_count?: number
          price_cents?: number
          original_price_cents?: number | null
          is_published?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      addons: {
        Row: {
          id: string
          name_zh: string
          name_en: string
          price_cents: number
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          id: string
          name_zh: string
          name_en: string
          price_cents: number
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          name_zh?: string
          name_en?: string
          price_cents?: number
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      custom_quotes: {
        Row: {
          id: string
          client_email: string | null
          project_name: string
          video_count: number
          amount_cents: number
          status: QuoteStatus
          created_by: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          client_email?: string | null
          project_name?: string
          video_count: number
          amount_cents: number
          status?: QuoteStatus
          created_by?: string | null
          expires_at?: string | null
        }
        Update: {
          client_email?: string | null
          project_name?: string
          video_count?: number
          amount_cents?: number
          status?: QuoteStatus
          expires_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          client_id: string
          presenter_profile_id: string | null
          title_zh: string
          title_en: string
          status: OrderStatus
          plan_id: string | null
          custom_quote_id: string | null
          addon_ids: string[]
          video_credits_total: number
          video_credits_used: number
          amount_cents: number
          currency: string
          payment_method: PaymentMethodType
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          receipt_url: string | null
          assigned_member_id: string | null
          latest_revision_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          client_id: string
          presenter_profile_id?: string | null
          title_zh?: string
          title_en?: string
          status?: OrderStatus
          plan_id?: string | null
          custom_quote_id?: string | null
          addon_ids?: string[]
          video_credits_total: number
          video_credits_used?: number
          amount_cents: number
          currency?: string
          payment_method?: PaymentMethodType
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          receipt_url?: string | null
          assigned_member_id?: string | null
          latest_revision_note?: string | null
        }
        Update: {
          presenter_profile_id?: string | null
          title_zh?: string
          title_en?: string
          status?: OrderStatus
          video_credits_used?: number
          receipt_url?: string | null
          assigned_member_id?: string | null
          latest_revision_note?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          id: string
          order_id: string
          client_id: string
          delta: number
          reason: CreditLedgerReason
          note: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          client_id: string
          delta: number
          reason: CreditLedgerReason
          note?: string
          created_by?: string | null
        }
        Update: {
          note?: string
        }
        Relationships: []
      }
      order_messages: {
        Row: {
          id: string
          order_id: string
          sender_user_id: string
          sender_side: MessageSenderSide
          body: string
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          sender_user_id: string
          sender_side: MessageSenderSide
          body?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          body?: string
          metadata?: Record<string, unknown>
        }
        Relationships: []
      }
      order_attachments: {
        Row: {
          id: string
          order_id: string
          message_id: string | null
          uploader_user_id: string
          r2_key: string
          file_name: string
          mime_type: string
          size_bytes: number
          status: AttachmentStatus
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          message_id?: string | null
          uploader_user_id: string
          r2_key: string
          file_name: string
          mime_type?: string
          size_bytes?: number
          status?: AttachmentStatus
        }
        Update: {
          message_id?: string | null
          status?: AttachmentStatus
        }
        Relationships: []
      }
      video_versions: {
        Row: {
          id: string
          order_id: string
          version_code: string
          version_type: VideoVersionType
          r2_key: string
          file_name: string
          notes: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          version_code: string
          version_type: VideoVersionType
          r2_key: string
          file_name: string
          notes?: string
          uploaded_by: string
        }
        Update: {
          notes?: string
        }
        Relationships: []
      }
      review_logs: {
        Row: {
          id: string
          order_id: string
          version_id: string
          reviewer_user_id: string
          action: ReviewAction
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          version_id: string
          reviewer_user_id: string
          action: ReviewAction
          comment?: string
        }
        Update: {
          comment?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          recipient_user_id: string
          order_id: string | null
          event_type: string
          title_zh: string
          title_en: string
          body_zh: string
          body_en: string
          is_read: boolean
          email_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_user_id: string
          order_id?: string | null
          event_type: string
          title_zh: string
          title_en: string
          body_zh?: string
          body_en?: string
          is_read?: boolean
          email_sent_at?: string | null
        }
        Update: {
          is_read?: boolean
          email_sent_at?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          id: string
          locale: AppLocale
          hero_cta_label: string
          content_json: Record<string, unknown>
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          locale: AppLocale
          hero_cta_label?: string
          content_json?: Record<string, unknown>
          updated_by?: string | null
        }
        Update: {
          hero_cta_label?: string
          content_json?: Record<string, unknown>
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      producer_orders_view: {
        Row: {
          id: string
          title_zh: string
          title_en: string
          status: OrderStatus
          video_credits_total: number
          video_credits_used: number
          assigned_member_id: string | null
          latest_revision_note: string | null
          created_at: string
          updated_at: string
          client_first_name: string
        }
        Relationships: []
      }
    }
    Functions: {
      current_team_member_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      is_active_team_member: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_team_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      is_repeat_customer: {
        Args: { target_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_locale: AppLocale
      order_status: OrderStatus
      video_version_type: VideoVersionType
      message_sender_side: MessageSenderSide
      payment_method_type: PaymentMethodType
      credit_ledger_reason: CreditLedgerReason
      quote_status: QuoteStatus
      attachment_status: AttachmentStatus
      review_action: ReviewAction
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
