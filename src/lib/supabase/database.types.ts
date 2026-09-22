// Hand-written to match supabase/migrations/20260917160000_core_schema.sql.
// Replace with the generated file once a real project is linked:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
//
// Every table needs `Relationships` (even empty) and the schema needs
// `Views`/`Functions` (even empty) — @supabase/postgrest-js's GenericTable /
// GenericSchema constraints require this exact shape to type `.select()`
// correctly. Omitting them doesn't error here; it silently makes every
// query resolve to `never` instead.

export type OrgRole = "owner" | "agent" | "analyst";
export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "image";
export type ConversationStatus = "open" | "closed";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrgRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organization_members"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          target: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          target?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
      line_channels: {
        Row: {
          id: string;
          organization_id: string;
          line_channel_id: string;
          bot_user_id: string;
          display_name: string;
          channel_secret_id: string;
          channel_access_token_id: string;
          created_at: string;
          updated_at: string;
        };
        // No Insert type on purpose — rows are only ever created via the
        // create_line_channel() RPC (see docs/decisions/0003), never a
        // direct table insert, since that's the only path that correctly
        // populates channel_secret_id/channel_access_token_id.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          organization_id: string;
          line_channel_id: string;
          line_user_id: string;
          display_name: string | null;
          picture_url: string | null;
          status: ConversationStatus;
          assigned_to: string | null;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        // No direct insert: rows are only ever created by
        // record_inbound_message() (service role, from the webhook).
        Insert: never;
        Update: { status?: ConversationStatus };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string;
          direction: MessageDirection;
          type: MessageType;
          content: string | null;
          media_path: string | null;
          line_message_id: string | null;
          sent_by: string | null;
          created_at: string;
        };
        // No direct insert: rows are only ever created by
        // record_inbound_message() / record_outbound_message().
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_line_channel: {
        Args: {
          p_organization_id: string;
          p_line_channel_id: string;
          p_bot_user_id: string;
          p_display_name: string;
          p_channel_secret: string;
          p_channel_access_token: string;
        };
        Returns: Database["public"]["Tables"]["line_channels"]["Row"];
      };
      get_line_channel_secrets: {
        Args: { p_line_channel_id: string };
        Returns: { channel_secret: string; channel_access_token: string }[];
      };
      get_line_channel_secrets_by_bot_user_id: {
        Args: { p_bot_user_id: string };
        Returns: { line_channel_id: string; channel_secret: string; channel_access_token: string }[];
      };
      delete_line_channel: {
        Args: { p_line_channel_id: string };
        Returns: undefined;
      };
      get_user_id_by_email: {
        Args: { p_email: string };
        Returns: string | null;
      };
      get_organization_members: {
        Args: { p_organization_id: string };
        Returns: {
          id: string;
          user_id: string;
          role: OrgRole;
          email: string;
          full_name: string | null;
          created_at: string;
        }[];
      };
      assign_conversation: {
        Args: { p_conversation_id: string; p_assigned_to: string | null };
        Returns: Database["public"]["Tables"]["conversations"]["Row"];
      };
      record_outbound_message: {
        Args: {
          p_conversation_id: string;
          p_type: MessageType;
          p_content: string | null;
          p_media_path: string | null;
          p_sent_by: string | null;
        };
        Returns: Database["public"]["Tables"]["messages"]["Row"];
      };
      upsert_conversation_for_webhook: {
        Args: {
          p_bot_user_id: string;
          p_line_user_id: string;
          p_display_name: string | null;
          p_picture_url: string | null;
        };
        Returns: Database["public"]["Tables"]["conversations"]["Row"];
      };
      insert_inbound_message: {
        Args: {
          p_conversation_id: string;
          p_type: MessageType;
          p_content: string | null;
          p_media_path: string | null;
          p_line_message_id: string | null;
        };
        Returns: Database["public"]["Tables"]["messages"]["Row"];
      };
    };
  };
};
