// Hand-written to match supabase/migrations/20260917160000_core_schema.sql.
// Replace with the generated file once a real project is linked:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
//
// Every table needs `Relationships` (even empty) and the schema needs
// `Views`/`Functions` (even empty) — @supabase/postgrest-js's GenericTable /
// GenericSchema constraints require this exact shape to type `.select()`
// correctly. Omitting them doesn't error here; it silently makes every
// query resolve to `never` instead.

// BroadcastBlock is imported (not duplicated) from its actual source of
// truth — the shape and the block->LINE-message conversion both live
// there — and re-exported so the two can never drift apart.
import type { BroadcastBlock } from "@/lib/broadcast/blocks";
export type { BroadcastBlock };

export type OrgRole = "owner" | "agent" | "analyst";
export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "image" | "sticker" | "file";
export type ConversationStatus = "open" | "closed";
export type BroadcastStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type BroadcastAudience = "all" | "conversations";
export type RichMenuLayout = "1x1" | "2x1" | "3x1" | "2x2" | "3x2" | "custom";
export type RichMenuStatus = "published" | "failed";
export type RichMenuActionType = "message" | "uri" | "richmenuswitch";
// `bounds` is only present when the parent rich menu's layout is "custom" —
// percentages (0-100) of the canvas, resolved to actual 2500x1686 pixels
// only when building the LINE API payload. Absent for template layouts,
// whose bounds are computed from `layout` instead (computeAreaBounds()).
export type RichMenuAreaData = {
  label: string;
  action_type: RichMenuActionType;
  // For "message"/"uri": the text/URL. For "richmenuswitch": the target
  // rich_menus.id (this app's own uuid, not a LINE id).
  action_value: string;
  bounds?: { x: number; y: number; width: number; height: number };
};

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
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
      broadcasts: {
        Row: {
          id: string;
          organization_id: string;
          line_channel_id: string;
          blocks: BroadcastBlock[];
          audience: BroadcastAudience;
          scheduled_at: string | null;
          status: BroadcastStatus;
          error_message: string | null;
          sent_by: string | null;
          created_at: string;
        };
        // No direct insert: rows are only ever created by record_broadcast()
        // and updated in place (draft edits, send-from-draft) by
        // update_broadcast(). Direct update IS still allowed (unlike other
        // tables here) — only for status/error_message, by the service-role
        // scheduled-send route claiming and resolving a queued broadcast,
        // which has no user session to run a SECURITY DEFINER function's
        // is_org_member() check against anyway.
        Insert: never;
        Update: { status?: BroadcastStatus; error_message?: string | null };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: { id?: string; organization_id: string; name: string; color?: string; created_at?: string };
        Update: { name?: string; color?: string };
        Relationships: [];
      };
      conversation_tags: {
        Row: { conversation_id: string; tag_id: string; created_at: string };
        Insert: { conversation_id: string; tag_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      rich_menus: {
        Row: {
          id: string;
          organization_id: string;
          line_channel_id: string;
          name: string;
          layout: RichMenuLayout;
          image_path: string;
          areas: RichMenuAreaData[];
          line_rich_menu_id: string | null;
          line_rich_menu_alias_id: string | null;
          is_default: boolean;
          status: RichMenuStatus;
          error_message: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        // No direct insert/update: rows are only ever created by
        // record_rich_menu(), toggled by set_default_rich_menu(), and
        // removed by delete_rich_menu_record().
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
      get_audit_log: {
        Args: { p_organization_id: string; p_limit?: number };
        Returns: {
          id: string;
          action: string;
          target: string | null;
          metadata: Record<string, unknown>;
          actor_id: string | null;
          actor_email: string | null;
          actor_full_name: string | null;
          created_at: string;
        }[];
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
      record_broadcast: {
        Args: {
          p_line_channel_id: string;
          p_blocks: BroadcastBlock[];
          p_audience: BroadcastAudience;
          p_scheduled_at: string | null;
          p_status: BroadcastStatus;
          p_error_message: string | null;
          p_sent_by: string | null;
        };
        Returns: Database["public"]["Tables"]["broadcasts"]["Row"];
      };
      update_broadcast: {
        Args: {
          p_broadcast_id: string;
          p_line_channel_id: string;
          p_blocks: BroadcastBlock[];
          p_audience: BroadcastAudience;
          p_scheduled_at: string | null;
          p_status: BroadcastStatus;
          p_error_message: string | null;
        };
        Returns: Database["public"]["Tables"]["broadcasts"]["Row"];
      };
      delete_broadcast_draft: {
        Args: { p_broadcast_id: string };
        Returns: undefined;
      };
      cancel_scheduled_broadcast: {
        Args: { p_broadcast_id: string };
        Returns: undefined;
      };
      record_rich_menu: {
        Args: {
          p_id: string | null;
          p_line_channel_id: string;
          p_name: string;
          p_layout: RichMenuLayout;
          p_image_path: string;
          p_areas: RichMenuAreaData[];
          p_line_rich_menu_id: string | null;
          p_line_rich_menu_alias_id: string | null;
          p_status: RichMenuStatus;
          p_error_message: string | null;
          p_created_by: string | null;
        };
        Returns: Database["public"]["Tables"]["rich_menus"]["Row"];
      };
      set_default_rich_menu: {
        Args: { p_rich_menu_id: string };
        Returns: Database["public"]["Tables"]["rich_menus"]["Row"];
      };
      delete_rich_menu_record: {
        Args: { p_rich_menu_id: string };
        Returns: undefined;
      };
    };
  };
};
