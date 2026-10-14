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
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          password_hash: string
          permissions: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash: string
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_establishments: {
        Row: {
          affiliate_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          affiliate_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          affiliate_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_establishments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_establishments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_establishments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_notification_reads: {
        Row: {
          affiliate_id: string
          id: string
          notification_id: string
          read_at: string
        }
        Insert: {
          affiliate_id: string
          id?: string
          notification_id: string
          read_at?: string
        }
        Update: {
          affiliate_id?: string
          id?: string
          notification_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_notification_reads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "affiliate_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          address: Json | null
          affiliate_code: string
          approval_date: string | null
          birth_date: string | null
          can_refer_subaffiliate: boolean
          commission_rate: number | null
          cpf: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          parent_affiliate_id: string | null
          pending_earnings: number | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          profile_image_url: string | null
          status: string | null
          sub_affiliate_commission_rate: number | null
          total_clicks: number | null
          total_conversions: number | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          affiliate_code: string
          approval_date?: string | null
          birth_date?: string | null
          can_refer_subaffiliate?: boolean
          commission_rate?: number | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          parent_affiliate_id?: string | null
          pending_earnings?: number | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_image_url?: string | null
          status?: string | null
          sub_affiliate_commission_rate?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          affiliate_code?: string
          approval_date?: string | null
          birth_date?: string | null
          can_refer_subaffiliate?: boolean
          commission_rate?: number | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          parent_affiliate_id?: string | null
          pending_earnings?: number | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          profile_image_url?: string | null
          status?: string | null
          sub_affiliate_commission_rate?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          level: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          level?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          level?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          identifier: string
          locked_until: string | null
          operation_type: string
          window_start: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          locked_until?: string | null
          operation_type: string
          window_start?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          locked_until?: string | null
          operation_type?: string
          window_start?: string | null
        }
        Relationships: []
      }
      bahofertas_establishment_gallery: {
        Row: {
          company_id: string
          created_at: string
          display_order: number
          id: string
          image_url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "bahofertas_establishment_gallery_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bahofertas_establishment_gallery_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      bahofertas_establishment_overrides: {
        Row: {
          about_text: string | null
          address_label: string | null
          banner_position: string
          carousel_primary: boolean
          carousel_secondary: boolean
          carousel_tertiary: boolean
          company_id: string
          created_at: string
          custom_banner_url: string | null
          custom_description: string | null
          custom_image_url: string | null
          custom_name: string | null
          display_order: number
          id: string
          important_notes: Json | null
          includes_included: Json | null
          includes_not_included: Json | null
          is_visible: boolean
          latitude: number | null
          longitude: number | null
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          address_label?: string | null
          banner_position?: string
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          company_id: string
          created_at?: string
          custom_banner_url?: string | null
          custom_description?: string | null
          custom_image_url?: string | null
          custom_name?: string | null
          display_order?: number
          id?: string
          important_notes?: Json | null
          includes_included?: Json | null
          includes_not_included?: Json | null
          is_visible?: boolean
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          address_label?: string | null
          banner_position?: string
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          company_id?: string
          created_at?: string
          custom_banner_url?: string | null
          custom_description?: string | null
          custom_image_url?: string | null
          custom_name?: string | null
          display_order?: number
          id?: string
          important_notes?: Json | null
          includes_included?: Json | null
          includes_not_included?: Json | null
          is_visible?: boolean
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bahofertas_establishment_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bahofertas_establishment_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      banner_slides: {
        Row: {
          created_at: string
          description: string
          desktop_image_url: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          mobile_image_url: string | null
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          desktop_image_url?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          mobile_image_url?: string | null
          subtitle: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          desktop_image_url?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          mobile_image_url?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      carousel_partners: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          discount_percent: number
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          phone: string | null
          rating: number
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          discount_percent: number
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          phone?: string | null
          rating?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          phone?: string | null
          rating?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      carousel_settings: {
        Row: {
          auto_rotation: boolean
          carousel_type: string
          created_at: string
          id: string
          is_random_order: boolean
          rotation_interval: number
          updated_at: string
        }
        Insert: {
          auto_rotation?: boolean
          carousel_type: string
          created_at?: string
          id?: string
          is_random_order?: boolean
          rotation_interval?: number
          updated_at?: string
        }
        Update: {
          auto_rotation?: boolean
          carousel_type?: string
          created_at?: string
          id?: string
          is_random_order?: boolean
          rotation_interval?: number
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          category: string
          created_at: string
          discount_percent: number
          id: string
          image_url: string | null
          metadata: Json | null
          offer_id: string
          original_price: number
          price: number
          quantity: number
          subtitle: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          discount_percent: number
          id?: string
          image_url?: string | null
          metadata?: Json | null
          offer_id: string
          original_price: number
          price: number
          quantity?: number
          subtitle?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          discount_percent?: number
          id?: string
          image_url?: string | null
          metadata?: Json | null
          offer_id?: string
          original_price?: number
          price?: number
          quantity?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cashier_otp_codes: {
        Row: {
          attempts: number
          cashier_id: string
          code_hash: string
          created_at: string
          device_fingerprint: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          cashier_id: string
          code_hash: string
          created_at?: string
          device_fingerprint: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          cashier_id?: string
          code_hash?: string
          created_at?: string
          device_fingerprint?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashier_otp_codes_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "partner_cashiers"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_shifts: {
        Row: {
          cashier_id: string
          closed_at: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          shift_label: string | null
          total_amount: number
          total_validations: number
          updated_at: string
        }
        Insert: {
          cashier_id: string
          closed_at?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          shift_label?: string | null
          total_amount?: number
          total_validations?: number
          updated_at?: string
        }
        Update: {
          cashier_id?: string
          closed_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          shift_label?: string | null
          total_amount?: number
          total_validations?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashier_shifts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "partner_cashiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_trusted_devices: {
        Row: {
          cashier_id: string
          created_at: string
          device_fingerprint: string
          device_label: string | null
          id: string
          last_used_at: string
        }
        Insert: {
          cashier_id: string
          created_at?: string
          device_fingerprint: string
          device_label?: string | null
          id?: string
          last_used_at?: string
        }
        Update: {
          cashier_id?: string
          created_at?: string
          device_fingerprint?: string
          device_label?: string | null
          id?: string
          last_used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashier_trusted_devices_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "partner_cashiers"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_voucher_validations: {
        Row: {
          amount: number | null
          cashier_id: string
          company_id: string
          error_message: string | null
          id: string
          offer_title: string | null
          shift_id: string | null
          status: string
          user_voucher_id: string | null
          validated_at: string
          voucher_code: string
        }
        Insert: {
          amount?: number | null
          cashier_id: string
          company_id: string
          error_message?: string | null
          id?: string
          offer_title?: string | null
          shift_id?: string | null
          status: string
          user_voucher_id?: string | null
          validated_at?: string
          voucher_code: string
        }
        Update: {
          amount?: number | null
          cashier_id?: string
          company_id?: string
          error_message?: string | null
          id?: string
          offer_title?: string | null
          shift_id?: string | null
          status?: string
          user_voucher_id?: string | null
          validated_at?: string
          voucher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashier_voucher_validations_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "partner_cashiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_voucher_validations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_voucher_validations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_voucher_validations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cashier_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_voucher_validations_user_voucher_id_fkey"
            columns: ["user_voucher_id"]
            isOneToOne: false
            referencedRelation: "user_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: Json | null
          approval_status: string | null
          banner_url: string | null
          business_hours: Json | null
          category_id: string | null
          cnpj: string
          commission_rate: number | null
          created_at: string | null
          description: string | null
          email: string
          email_verified: boolean | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          logo_url: string | null
          name: string
          partner_retention_rate: number | null
          password_hash: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          responsible_cpf: string | null
          responsible_name: string | null
          trade_name: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: Json | null
          approval_status?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          category_id?: string | null
          cnpj: string
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          email: string
          email_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          logo_url?: string | null
          name: string
          partner_retention_rate?: number | null
          password_hash?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: Json | null
          approval_status?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          category_id?: string | null
          cnpj?: string
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          email?: string
          email_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          logo_url?: string | null
          name?: string
          partner_retention_rate?: number | null
          password_hash?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_percent: number
          id: string
          is_active: boolean
          is_revoked: boolean
          max_uses: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_percent: number
          id?: string
          is_active?: boolean
          is_revoked?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          is_revoked?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string | null
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      etg_api_logs: {
        Row: {
          book_hash: string | null
          created_at: string
          duration_ms: number | null
          endpoint: string
          error: string | null
          id: string
          method: string
          partner_order_id: string | null
          raw_request: string | null
          raw_response: string | null
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          response_status: number | null
          search_hash: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          book_hash?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          error?: string | null
          id?: string
          method?: string
          partner_order_id?: string | null
          raw_request?: string | null
          raw_response?: string | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_status?: number | null
          search_hash?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          book_hash?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          error?: string | null
          id?: string
          method?: string
          partner_order_id?: string | null
          raw_request?: string | null
          raw_response?: string | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_status?: number | null
          search_hash?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      etg_bookings: {
        Row: {
          book_hash: string | null
          booking_response: Json | null
          check_in: string
          check_out: string
          created_at: string
          currency: string
          guests: Json
          hotel_hid: string
          hotel_name: string
          id: string
          order_id: string | null
          partner_order_id: string | null
          payment_type: string | null
          prebook_data: Json | null
          rooms: number
          status: string
          total_price: number
          updated_at: string
          user_id: string
          voucher_url: string | null
        }
        Insert: {
          book_hash?: string | null
          booking_response?: Json | null
          check_in: string
          check_out: string
          created_at?: string
          currency?: string
          guests?: Json
          hotel_hid: string
          hotel_name: string
          id?: string
          order_id?: string | null
          partner_order_id?: string | null
          payment_type?: string | null
          prebook_data?: Json | null
          rooms?: number
          status?: string
          total_price: number
          updated_at?: string
          user_id: string
          voucher_url?: string | null
        }
        Update: {
          book_hash?: string | null
          booking_response?: Json | null
          check_in?: string
          check_out?: string
          created_at?: string
          currency?: string
          guests?: Json
          hotel_hid?: string
          hotel_name?: string
          id?: string
          order_id?: string | null
          partner_order_id?: string | null
          payment_type?: string | null
          prebook_data?: Json | null
          rooms?: number
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
          voucher_url?: string | null
        }
        Relationships: []
      }
      etg_hotel_airports: {
        Row: {
          airports: Json
          created_at: string
          hid: string
          last_sync_at: string
        }
        Insert: {
          airports?: Json
          created_at?: string
          hid: string
          last_sync_at?: string
        }
        Update: {
          airports?: Json
          created_at?: string
          hid?: string
          last_sync_at?: string
        }
        Relationships: []
      }
      etg_hotels: {
        Row: {
          address: string | null
          amenities: Json | null
          city: string
          created_at: string
          description_struct: Json | null
          hid: string
          id: string
          images: Json | null
          last_sync_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          raw_data: Json | null
          region_id: number | null
          star_rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          city: string
          created_at?: string
          description_struct?: Json | null
          hid: string
          id?: string
          images?: Json | null
          last_sync_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          raw_data?: Json | null
          region_id?: number | null
          star_rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          city?: string
          created_at?: string
          description_struct?: Json | null
          hid?: string
          id?: string
          images?: Json | null
          last_sync_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          raw_data?: Json | null
          region_id?: number | null
          star_rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      etg_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          max_requests: number
          requests_count: number
          window_seconds: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          max_requests: number
          requests_count?: number
          window_seconds: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          max_requests?: number
          requests_count?: number
          window_seconds?: number
          window_start?: string
        }
        Relationships: []
      }
      etg_regions: {
        Row: {
          country_code: string | null
          created_at: string
          id: number
          name: string
          parent_id: number | null
          raw_data: Json | null
          region_type: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id: number
          name: string
          parent_id?: number | null
          raw_data?: Json | null
          region_type?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: number
          name?: string
          parent_id?: number | null
          raw_data?: Json | null
          region_type?: string | null
        }
        Relationships: []
      }
      etg_search_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          results: Json
          search_hash: string | null
          search_params: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          results?: Json
          search_hash?: string | null
          search_params: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          results?: Json
          search_hash?: string | null
          search_params?: Json
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_type: string
          attempts: number | null
          created_at: string | null
          id: string
          identifier: string
          last_attempt: string | null
          locked_until: string | null
        }
        Insert: {
          attempt_type: string
          attempts?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          last_attempt?: string | null
          locked_until?: string | null
        }
        Update: {
          attempt_type?: string
          attempts?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          last_attempt?: string | null
          locked_until?: string | null
        }
        Relationships: []
      }
      featured_offers: {
        Row: {
          auto_rotation: boolean
          carousel_section: string
          created_at: string
          custom_image_url: string | null
          custom_subtitle: string | null
          custom_title: string | null
          display_order: number
          id: string
          is_active: boolean
          offer_id: string
          updated_at: string
        }
        Insert: {
          auto_rotation?: boolean
          carousel_section?: string
          created_at?: string
          custom_image_url?: string | null
          custom_subtitle?: string | null
          custom_title?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          offer_id: string
          updated_at?: string
        }
        Update: {
          auto_rotation?: boolean
          carousel_section?: string
          created_at?: string
          custom_image_url?: string | null
          custom_subtitle?: string | null
          custom_title?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          offer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      novaxs_establishment_gallery: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          novaxs_establishment_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          novaxs_establishment_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          novaxs_establishment_id?: string
        }
        Relationships: []
      }
      novaxs_establishment_overrides: {
        Row: {
          about_text: string | null
          address_label: string | null
          banner_position: string
          carousel_primary: boolean
          carousel_secondary: boolean
          carousel_tertiary: boolean
          created_at: string
          custom_banner_url: string | null
          custom_description: string | null
          custom_image_url: string | null
          custom_name: string | null
          display_order: number
          id: string
          important_notes: Json | null
          includes_included: Json | null
          includes_not_included: Json | null
          is_visible: boolean
          latitude: number | null
          longitude: number | null
          novaxs_establishment_id: string
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          address_label?: string | null
          banner_position?: string
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          created_at?: string
          custom_banner_url?: string | null
          custom_description?: string | null
          custom_image_url?: string | null
          custom_name?: string | null
          display_order?: number
          id?: string
          important_notes?: Json | null
          includes_included?: Json | null
          includes_not_included?: Json | null
          is_visible?: boolean
          latitude?: number | null
          longitude?: number | null
          novaxs_establishment_id: string
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          address_label?: string | null
          banner_position?: string
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          created_at?: string
          custom_banner_url?: string | null
          custom_description?: string | null
          custom_image_url?: string | null
          custom_name?: string | null
          display_order?: number
          id?: string
          important_notes?: Json | null
          includes_included?: Json | null
          includes_not_included?: Json | null
          is_visible?: boolean
          latitude?: number | null
          longitude?: number | null
          novaxs_establishment_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      novaxs_month_availability_cache: {
        Row: {
          establishment_id: string
          month_key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          establishment_id: string
          month_key: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          establishment_id?: string
          month_key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      novaxs_product_overrides: {
        Row: {
          carousel_primary: boolean
          carousel_secondary: boolean
          carousel_tertiary: boolean
          created_at: string
          custom_description: string | null
          custom_image_url: string | null
          custom_name: string | null
          custom_old_price_cents: number | null
          custom_price_cents: number | null
          id: string
          is_visible: boolean
          novaxs_establishment_id: string
          novaxs_product_id: string
          updated_at: string
        }
        Insert: {
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          created_at?: string
          custom_description?: string | null
          custom_image_url?: string | null
          custom_name?: string | null
          custom_old_price_cents?: number | null
          custom_price_cents?: number | null
          id?: string
          is_visible?: boolean
          novaxs_establishment_id: string
          novaxs_product_id: string
          updated_at?: string
        }
        Update: {
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          created_at?: string
          custom_description?: string | null
          custom_image_url?: string | null
          custom_name?: string | null
          custom_old_price_cents?: number | null
          custom_price_cents?: number | null
          id?: string
          is_visible?: boolean
          novaxs_establishment_id?: string
          novaxs_product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          banner_image_url: string | null
          card_image_url: string | null
          carousel_primary: boolean
          carousel_secondary: boolean
          carousel_tertiary: boolean
          category: string | null
          city: string | null
          company_id: string
          created_at: string
          description: string | null
          discount_percent: number | null
          featured_order: number | null
          id: string
          is_active: boolean
          original_price: number | null
          price: number
          promotion_request_id: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          card_image_url?: string | null
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          category?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          featured_order?: number | null
          id?: string
          is_active?: boolean
          original_price?: number | null
          price: number
          promotion_request_id?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          card_image_url?: string | null
          carousel_primary?: boolean
          carousel_secondary?: boolean
          carousel_tertiary?: boolean
          category?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          featured_order?: number | null
          id?: string
          is_active?: boolean
          original_price?: number | null
          price?: number
          promotion_request_id?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_cashiers: {
        Row: {
          company_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          shift_label: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          shift_label?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          shift_label?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_cashiers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_cashiers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      promotion_requests: {
        Row: {
          company_id: string
          company_name: string
          created_at: string
          id: string
          notes: string | null
          requester_email: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          id?: string
          notes?: string | null
          requester_email: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          requester_email?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotional_banners: {
        Row: {
          background_color: string | null
          background_position: string | null
          background_size: string | null
          banner_position: string
          bullet_points: Json | null
          button_link: string | null
          button_text: string | null
          container_height: string | null
          container_max_width: string | null
          container_padding: string | null
          created_at: string | null
          description: string
          display_order: number | null
          id: string
          image_height: number | null
          image_url: string
          image_width: number | null
          is_active: boolean | null
          mobile_image_url: string | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          background_position?: string | null
          background_size?: string | null
          banner_position: string
          bullet_points?: Json | null
          button_link?: string | null
          button_text?: string | null
          container_height?: string | null
          container_max_width?: string | null
          container_padding?: string | null
          created_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          image_height?: number | null
          image_url: string
          image_width?: number | null
          is_active?: boolean | null
          mobile_image_url?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          background_position?: string | null
          background_size?: string | null
          banner_position?: string
          bullet_points?: Json | null
          button_link?: string | null
          button_text?: string | null
          container_height?: string | null
          container_max_width?: string | null
          container_padding?: string | null
          created_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          image_height?: number | null
          image_url?: string
          image_width?: number | null
          is_active?: boolean | null
          mobile_image_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_notification_logs: {
        Row: {
          body: string
          created_at: string
          id: string
          sent_by: string | null
          title: string
          total_failed: number
          total_sent: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sent_by?: string | null
          title: string
          total_failed?: number
          total_sent?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sent_by?: string | null
          title?: string
          total_failed?: number
          total_sent?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          requests_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          requests_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          requests_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      ticket_bookings: {
        Row: {
          buyer_info: Json
          created_at: string
          currency: string
          email_sent_at: string | null
          establishment_id: string | null
          establishment_name: string | null
          id: string
          localizador: string | null
          novaxs_bill_id: number | null
          novaxs_token: string | null
          products: Json
          status: string
          tickets: Json | null
          total_price: number
          updated_at: string
          use_date: string | null
          user_id: string
          voucher_id: string | null
          voucher_pdf_path: string | null
          voucher_token: string | null
        }
        Insert: {
          buyer_info?: Json
          created_at?: string
          currency?: string
          email_sent_at?: string | null
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          localizador?: string | null
          novaxs_bill_id?: number | null
          novaxs_token?: string | null
          products?: Json
          status?: string
          tickets?: Json | null
          total_price?: number
          updated_at?: string
          use_date?: string | null
          user_id: string
          voucher_id?: string | null
          voucher_pdf_path?: string | null
          voucher_token?: string | null
        }
        Update: {
          buyer_info?: Json
          created_at?: string
          currency?: string
          email_sent_at?: string | null
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          localizador?: string | null
          novaxs_bill_id?: number | null
          novaxs_token?: string | null
          products?: Json
          status?: string
          tickets?: Json | null
          total_price?: number
          updated_at?: string
          use_date?: string | null
          user_id?: string
          voucher_id?: string | null
          voucher_pdf_path?: string | null
          voucher_token?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          description: string | null
          fee_amount: number | null
          id: string
          metadata: Json | null
          net_amount: number
          payment_method: string | null
          payment_reference: string | null
          processed_at: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
          user_voucher_id: string | null
          voucher_id: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount: number
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          user_voucher_id?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          user_voucher_id?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_voucher_id_fkey"
            columns: ["user_voucher_id"]
            isOneToOne: false
            referencedRelation: "user_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          commission_amount: number
          created_at: string | null
          economy_amount: number | null
          expires_at: string
          id: string
          offer_id: string | null
          original_price: number | null
          purchase_price: number
          qr_code: string
          status: string | null
          updated_at: string | null
          used_at: string | null
          used_location: Json | null
          user_id: string
          voucher_id: string
        }
        Insert: {
          commission_amount: number
          created_at?: string | null
          economy_amount?: number | null
          expires_at: string
          id?: string
          offer_id?: string | null
          original_price?: number | null
          purchase_price: number
          qr_code: string
          status?: string | null
          updated_at?: string | null
          used_at?: string | null
          used_location?: Json | null
          user_id: string
          voucher_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string | null
          economy_amount?: number | null
          expires_at?: string
          id?: string
          offer_id?: string | null
          original_price?: number | null
          purchase_price?: number
          qr_code?: string
          status?: string | null
          updated_at?: string | null
          used_at?: string | null
          used_location?: Json | null
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vouchers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: Json | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          password_hash: string
          phone: string | null
          phone_verified: boolean | null
          profile_image_url: string | null
          referrer_affiliate_code: string | null
          role: string
          role_type: string | null
          updated_at: string | null
          welcome_discount_used_at: string | null
        }
        Insert: {
          address?: Json | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          password_hash: string
          phone?: string | null
          phone_verified?: boolean | null
          profile_image_url?: string | null
          referrer_affiliate_code?: string | null
          role?: string
          role_type?: string | null
          updated_at?: string | null
          welcome_discount_used_at?: string | null
        }
        Update: {
          address?: Json | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          password_hash?: string
          phone?: string | null
          phone_verified?: boolean | null
          profile_image_url?: string | null
          referrer_affiliate_code?: string | null
          role?: string
          role_type?: string | null
          updated_at?: string | null
          welcome_discount_used_at?: string | null
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          final_price: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          max_discount_amount: number | null
          min_purchase_amount: number | null
          original_price: number | null
          qr_code: string | null
          start_date: string
          tags: string[] | null
          terms_conditions: string | null
          title: string
          total_quantity: number | null
          updated_at: string | null
          used_quantity: number | null
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          final_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          original_price?: number | null
          qr_code?: string | null
          start_date: string
          tags?: string[] | null
          terms_conditions?: string | null
          title: string
          total_quantity?: number | null
          updated_at?: string | null
          used_quantity?: number | null
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          final_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          original_price?: number | null
          qr_code?: string | null
          start_date?: string
          tags?: string[] | null
          terms_conditions?: string | null
          title?: string
          total_quantity?: number | null
          updated_at?: string | null
          used_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          payload: Json
          processed_at: string | null
          signature: string | null
          status: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          payload: Json
          processed_at?: string | null
          signature?: string | null
          status?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json
          processed_at?: string | null
          signature?: string | null
          status?: string | null
          webhook_type?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_by_email: string
          requester_name: string
          status: string
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_by_email: string
          requester_name: string
          status?: string
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_by_email?: string
          requester_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_public_view: {
        Row: {
          address: Json | null
          approval_status: string | null
          banner_url: string | null
          business_hours: Json | null
          category_id: string | null
          cnpj: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string | null
          phone: string | null
          trade_name: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: Json | null
          approval_status?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          category_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: Json | null
          approval_status?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          category_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_withdrawal_request: {
        Args: { admin_notes?: string; request_id: string }
        Returns: undefined
      }
      can_refer_sub_affiliate: { Args: { _code: string }; Returns: boolean }
      check_account_lockout_enhanced: { Args: { "": string }; Returns: boolean }
      cleanup_old_security_logs: { Args: never; Returns: number }
      cleanup_sensitive_data: { Args: never; Returns: number }
      create_offer_admin: {
        Args: {
          banner_image_url: string
          card_image_url: string
          category?: string
          city?: string
          company_id: string
          description?: string
          is_active?: boolean
          original_price?: number
          price: number
          subtitle?: string
          title: string
        }
        Returns: string
      }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_qr_code: { Args: never; Returns: string }
      get_active_offers: {
        Args: never
        Returns: {
          card_image_url: string
          category: string
          company_id: string
          created_at: string
          discount_percent: number
          featured_order: number
          id: string
          is_active: boolean
          original_price: number
          price: number
          subtitle: string
          title: string
        }[]
      }
      get_admin_total_affiliates_count: { Args: never; Returns: number }
      get_admin_total_companies_count: { Args: never; Returns: number }
      get_admin_total_users_count: { Args: never; Returns: number }
      get_admin_user_counts: {
        Args: never
        Returns: {
          active_users: number
          inactive_users: number
          total_users: number
        }[]
      }
      get_affiliate_payments_data: {
        Args: { "": string }
        Returns: {
          admin_notes: string
          amount: number
          created_at: string
          id: string
          payment_method: string
          processed_at: string
          status: string
        }[]
      }
      get_affiliate_referral_data: {
        Args: { _affiliate_code: string }
        Returns: {
          commission_amount: number
          commission_id: string
          created_at: string
          level: number
          product_title: string
          sale_amount: number
          source_transaction_id: string
        }[]
      }
      get_affiliate_referred_users: {
        Args: { _affiliate_code: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_company_admin_data_secure: {
        Args: never
        Returns: {
          address: Json
          approval_status: string
          banner_url: string
          business_hours: Json
          category_id: string
          cnpj: string
          commission_rate: number
          created_at: string
          description: string
          email: string
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string
          name: string
          phone: string
          trade_name: string
          updated_at: string
          website: string
        }[]
      }
      get_current_cashier_id: { Args: never; Returns: string }
      get_enhanced_security_metrics: {
        Args: never
        Returns: {
          description: string
          metric_name: string
          metric_value: number
          severity: string
        }[]
      }
      get_featured_offers: {
        Args: never
        Returns: {
          card_image_url: string
          category: string
          company_id: string
          company_is_verified: boolean
          company_name: string
          discount_percent: number
          id: string
          original_price: number
          price: number
          subtitle: string
          title: string
        }[]
      }
      get_home_featured_offers: {
        Args: never
        Returns: {
          banner_image_url: string
          card_image_url: string
          category: string
          company_id: string
          company_is_verified: boolean
          company_name: string
          discount_percent: number
          display_order: number
          id: string
          original_price: number
          price: number
          subtitle: string
          title: string
        }[]
      }
      get_home_novaxs_overrides: { Args: never; Returns: Json }
      get_offers_admin_data: {
        Args: never
        Returns: {
          banner_image_url: string
          card_image_url: string
          category: string
          city: string
          company_approval_status: string
          company_id: string
          company_is_verified: boolean
          company_name: string
          company_trade_name: string
          created_at: string
          description: string
          discount_percent: number
          id: string
          is_active: boolean
          is_featured: boolean
          original_price: number
          price: number
          subtitle: string
          title: string
          updated_at: string
        }[]
      }
      get_partner_company_id: { Args: never; Returns: string }
      get_partner_sales_data: {
        Args: { partner_company_id: string }
        Returns: {
          buyer_email: string
          buyer_name: string
          commission_amount: number
          economy_amount: number
          offer_title: string
          original_price: number
          purchase_price: number
          purchased_at: string
          qr_code: string
          used_at: string
          voucher_id: string
          voucher_status: string
        }[]
      }
      get_partner_stats: { Args: { partner_company_id: string }; Returns: Json }
      get_pending_affiliates_admin: {
        Args: never
        Returns: {
          affiliate_code: string
          created_at: string
          email: string
          full_name: string
          id: string
          status: string
        }[]
      }
      get_pending_companies_admin: {
        Args: never
        Returns: {
          approval_status: string
          cnpj: string
          created_at: string
          email: string
          id: string
          is_verified: boolean
          name: string
        }[]
      }
      get_promotional_banner: {
        Args: { position_param: string }
        Returns: {
          background_color: string
          background_position: string
          background_size: string
          banner_position: string
          bullet_points: Json
          button_link: string
          button_text: string
          container_height: string
          container_max_width: string
          container_padding: string
          description: string
          id: string
          image_height: number
          image_url: string
          image_width: number
          subtitle: string
          title: string
        }[]
      }
      get_public_company_data: {
        Args: { company_ids?: string[] }
        Returns: {
          banner_url: string
          category_id: string
          created_at: string
          description: string
          id: string
          is_verified: boolean
          logo_url: string
          name: string
          trade_name: string
          website: string
        }[]
      }
      get_public_company_info: {
        Args: { company_ids?: string[] }
        Returns: {
          banner_url: string
          category_id: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string
          name: string
          trade_name: string
        }[]
      }
      get_public_company_marketplace_info: {
        Args: { company_ids?: string[] }
        Returns: {
          banner_url: string
          category_id: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string
          name: string
          trade_name: string
        }[]
      }
      get_safe_company_data: {
        Args: { company_ids?: string[] }
        Returns: {
          banner_url: string
          category_id: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_verified: boolean
          logo_url: string
          name: string
          trade_name: string
        }[]
      }
      get_secondary_featured_offers: {
        Args: never
        Returns: {
          banner_image_url: string
          card_image_url: string
          category: string
          company_id: string
          company_is_verified: boolean
          company_name: string
          discount_percent: number
          display_order: number
          id: string
          original_price: number
          price: number
          subtitle: string
          title: string
        }[]
      }
      get_security_metrics: {
        Args: never
        Returns: {
          description: string
          metric_name: string
          metric_value: number
        }[]
      }
      get_sub_affiliate_earnings: {
        Args: { parent_id: string }
        Returns: {
          parent_commission_earned: number
          total_sub_affiliate_earnings: number
          total_sub_affiliates: number
        }[]
      }
      get_tertiary_featured_offers: {
        Args: never
        Returns: {
          banner_image_url: string
          card_image_url: string
          category: string
          company_id: string
          company_is_verified: boolean
          company_name: string
          discount_percent: number
          display_order: number
          id: string
          original_price: number
          price: number
          subtitle: string
          title: string
        }[]
      }
      get_user_role: { Args: { user_id?: string }; Returns: string }
      get_user_voucher_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_count: number
          expired_count: number
          total_economy: number
          used_count: number
        }[]
      }
      get_users_admin_masked: {
        Args: never
        Returns: {
          cpf: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          role_type: string
          updated_at: string
        }[]
      }
      is_account_locked: {
        Args: { email_address: string; ip_address?: string }
        Returns: boolean
      }
      is_active_affiliate: { Args: never; Returns: boolean }
      is_active_partner: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: { user_id: string }; Returns: boolean }
      is_ancestor_affiliate_of: {
        Args: { _descendant_id: string }
        Returns: boolean
      }
      is_cashier_of_company: { Args: { _company_id: string }; Returns: boolean }
      is_current_affiliate: {
        Args: { affiliate_email: string; affiliate_user_id?: string }
        Returns: boolean
      }
      is_current_user_admin_secure: { Args: never; Returns: boolean }
      is_strict_admin: { Args: never; Returns: boolean }
      is_verified_admin_safe: { Args: never; Returns: boolean }
      log_security_event: {
        Args: {
          description?: string
          entity_id?: string
          entity_type: string
          event_type: string
          level?: string
          metadata?: Json
        }
        Returns: undefined
      }
      log_sensitive_access_enhanced: {
        Args: {
          access_type: string
          record_id: string
          sensitive_fields?: string[]
          table_name: string
        }
        Returns: undefined
      }
      log_sensitive_data_access: {
        Args: {
          accessed_fields: string[]
          action_type: string
          record_id: string
          table_name: string
        }
        Returns: undefined
      }
      mask_sensitive_data: {
        Args: { data_type: string; value: string }
        Returns: string
      }
      process_affiliate_commission: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      record_login_attempt: {
        Args: { attempt_type: string; identifier: string; success: boolean }
        Returns: undefined
      }
      reject_affiliate: {
        Args: { affiliate_id: string; rejection_reason?: string }
        Returns: undefined
      }
      reject_partner: {
        Args: { partner_id: string; rejection_reason?: string }
        Returns: undefined
      }
      reject_withdrawal_request: {
        Args: { rejection_reason?: string; request_id: string }
        Returns: undefined
      }
      sync_approved_promotion_request_to_offer: {
        Args: { _promotion_request_id: string }
        Returns: string
      }
      track_affiliate_click: {
        Args: { affiliate_code_param: string }
        Returns: boolean
      }
      update_expired_vouchers: { Args: never; Returns: undefined }
      validate_sensitive_input: {
        Args: { input_type: string; input_value: string }
        Returns: boolean
      }
      validate_voucher_by_code: {
        Args: { partner_company_id: string; voucher_code: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
