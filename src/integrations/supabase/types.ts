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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          call_type: string
          caller_id: string
          chat_id: string | null
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          receiver_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          call_type: string
          caller_id: string
          chat_id?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          receiver_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          chat_id?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          receiver_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          chat_id: string
          cleared_at: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          is_hidden: boolean
          is_muted: boolean
          is_pinned: boolean
          joined_at: string | null
          last_delivered_at: string | null
          last_read_at: string | null
          role: string | null
          theme: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          cleared_at?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_hidden?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string | null
          last_delivered_at?: string | null
          last_read_at?: string | null
          role?: string | null
          theme?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          cleared_at?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_hidden?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string | null
          last_delivered_at?: string | null
          last_read_at?: string | null
          role?: string | null
          theme?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          disappear_seconds: number | null
          id: string
          invite_code: string | null
          invite_enabled: boolean
          is_group: boolean | null
          name: string | null
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          disappear_seconds?: number | null
          id?: string
          invite_code?: string | null
          invite_enabled?: boolean
          is_group?: boolean | null
          name?: string | null
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          disappear_seconds?: number | null
          id?: string
          invite_code?: string | null
          invite_enabled?: boolean
          is_group?: boolean | null
          name?: string | null
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      hidden_space_settings: {
        Row: {
          auto_lock_seconds: number
          created_at: string
          keyword_hash: string
          notification_mode: string
          pin_hash: string | null
          recovery_email: string | null
          theme: Json
          updated_at: string
          user_id: string
          wallpaper_url: string | null
        }
        Insert: {
          auto_lock_seconds?: number
          created_at?: string
          keyword_hash: string
          notification_mode?: string
          pin_hash?: string | null
          recovery_email?: string | null
          theme?: Json
          updated_at?: string
          user_id: string
          wallpaper_url?: string | null
        }
        Update: {
          auto_lock_seconds?: number
          created_at?: string
          keyword_hash?: string
          notification_mode?: string
          pin_hash?: string | null
          recovery_email?: string | null
          theme?: Json
          updated_at?: string
          user_id?: string
          wallpaper_url?: string | null
        }
        Relationships: []
      }
      listen_together_sessions: {
        Row: {
          album_art_url: string | null
          artist: string
          chat_id: string | null
          created_at: string
          external_url: string | null
          guest_id: string
          host_id: string
          id: string
          provider: string
          status: string
          track_id: string
          track_name: string
          updated_at: string
        }
        Insert: {
          album_art_url?: string | null
          artist: string
          chat_id?: string | null
          created_at?: string
          external_url?: string | null
          guest_id: string
          host_id: string
          id?: string
          provider: string
          status?: string
          track_id: string
          track_name: string
          updated_at?: string
        }
        Update: {
          album_art_url?: string | null
          artist?: string
          chat_id?: string | null
          created_at?: string
          external_url?: string | null
          guest_id?: string
          host_id?: string
          id?: string
          provider?: string
          status?: string
          track_id?: string
          track_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listen_together_sessions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_edited: boolean | null
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          reply_to: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          reply_to?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          reply_to?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      music_connections: {
        Row: {
          access_token: string
          connected_at: string
          display_name: string | null
          expires_at: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          display_name?: string | null
          expires_at?: string | null
          provider: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          display_name?: string | null
          expires_at?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      music_presence: {
        Row: {
          album: string | null
          album_art_url: string | null
          artist: string
          duration_ms: number | null
          external_url: string | null
          is_playing: boolean
          progress_ms: number | null
          provider: string
          track_id: string
          track_name: string
          updated_at: string
          uri: string | null
          user_id: string
        }
        Insert: {
          album?: string | null
          album_art_url?: string | null
          artist: string
          duration_ms?: number | null
          external_url?: string | null
          is_playing?: boolean
          progress_ms?: number | null
          provider: string
          track_id: string
          track_name: string
          updated_at?: string
          uri?: string | null
          user_id: string
        }
        Update: {
          album?: string | null
          album_art_url?: string | null
          artist?: string
          duration_ms?: number | null
          external_url?: string | null
          is_playing?: boolean
          progress_ms?: number | null
          provider?: string
          track_id?: string
          track_name?: string
          updated_at?: string
          uri?: string | null
          user_id?: string
        }
        Relationships: []
      }
      music_recent_tracks: {
        Row: {
          album: string | null
          album_art_url: string | null
          artist: string
          external_url: string | null
          id: string
          played_at: string
          provider: string
          track_id: string
          track_name: string
          user_id: string
        }
        Insert: {
          album?: string | null
          album_art_url?: string | null
          artist: string
          external_url?: string | null
          id?: string
          played_at?: string
          provider: string
          track_id: string
          track_name: string
          user_id: string
        }
        Update: {
          album?: string | null
          album_art_url?: string | null
          artist?: string
          external_url?: string | null
          id?: string
          played_at?: string
          provider?: string
          track_id?: string
          track_name?: string
          user_id?: string
        }
        Relationships: []
      }
      music_settings: {
        Row: {
          allow_friends_see: boolean
          allow_listen_together: boolean
          auto_share: boolean
          hide_activity: boolean
          preferred_provider: string
          show_album_art: boolean
          show_current_song: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_friends_see?: boolean
          allow_listen_together?: boolean
          auto_share?: boolean
          hide_activity?: boolean
          preferred_provider?: string
          show_album_art?: boolean
          show_current_song?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_friends_see?: boolean
          allow_listen_together?: boolean
          auto_share?: boolean
          hide_activity?: boolean
          preferred_provider?: string
          show_album_art?: boolean
          show_current_song?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          ghost_mode: boolean
          id: string
          is_online: boolean | null
          last_seen: string | null
          password_configured: boolean
          status_text: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          ghost_mode?: boolean
          id: string
          is_online?: boolean | null
          last_seen?: string | null
          password_configured?: boolean
          status_text?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          ghost_mode?: boolean
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          password_configured?: boolean
          status_text?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          chat_id: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          media_url: string | null
          message_type: string
          reply_to: string | null
          room_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "room_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_track: Json | null
          description: string | null
          id: string
          invite_code: string | null
          is_private: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_track?: Json | null
          description?: string | null
          id?: string
          invite_code?: string | null
          is_private?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_track?: Json | null
          description?: string | null
          id?: string
          invite_code?: string | null
          is_private?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string | null
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          notifications_enabled: boolean | null
          sound_enabled: boolean | null
          stories_privacy: string
          story_hidden_from: string[]
          story_replies_privacy: string
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sound_enabled?: boolean | null
          stories_privacy?: string
          story_hidden_from?: string[]
          story_replies_privacy?: string
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sound_enabled?: boolean | null
          stories_privacy?: string
          story_hidden_from?: string[]
          story_replies_privacy?: string
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_chat_members: {
        Args: { _chat_id: string; _user_ids: string[] }
        Returns: number
      }
      can_view_music: {
        Args: { _author: string; _viewer: string }
        Returns: boolean
      }
      can_view_stories: {
        Args: { _author: string; _viewer: string }
        Returns: boolean
      }
      chat_permission_ok: {
        Args: { _chat_id: string; _key: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_messages: { Args: never; Returns: undefined }
      delete_chat: { Args: { _chat_id: string }; Returns: undefined }
      get_email_for_username: { Args: { _username: string }; Returns: string }
      get_message_receipts: {
        Args: { _message_id: string }
        Returns: {
          delivered_at: string
          read_at: string
          user_id: string
        }[]
      }
      get_or_create_direct_chat: {
        Args: { _other_user_id: string }
        Returns: string
      }
      is_blocked: {
        Args: { _blocked: string; _blocker: string }
        Returns: boolean
      }
      is_chat_member: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_member: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      join_chat_by_invite: { Args: { _invite_code: string }; Returns: string }
      join_room: {
        Args: { _invite_code?: string; _room_id: string }
        Returns: string
      }
      join_room_by_code: { Args: { _invite_code: string }; Returns: string }
      mark_chat_delivered: { Args: { _chat_id: string }; Returns: undefined }
      mark_chat_read: { Args: { _chat_id: string }; Returns: undefined }
      mark_password_configured: { Args: never; Returns: undefined }
      preview_chat_invite: {
        Args: { _invite_code: string }
        Returns: {
          already_member: boolean
          avatar_url: string
          chat_id: string
          description: string
          member_count: number
          name: string
        }[]
      }
      room_role: { Args: { _room: string; _user: string }; Returns: string }
      rotate_chat_invite: { Args: { _chat_id: string }; Returns: string }
      set_chat_hidden: {
        Args: { _chat_id: string; _hidden: boolean }
        Returns: undefined
      }
      set_chat_invite_enabled: {
        Args: { _chat_id: string; _enabled: boolean }
        Returns: undefined
      }
      set_chat_permission: {
        Args: { _chat_id: string; _key: string; _value: string }
        Returns: undefined
      }
      set_my_username: { Args: { _username: string }; Returns: undefined }
      setup_hidden_space: {
        Args: {
          _auto_lock_seconds?: number
          _keyword: string
          _notification_mode?: string
          _pin?: string
          _recovery_email?: string
        }
        Returns: undefined
      }
      transfer_chat_ownership: {
        Args: { _chat_id: string; _new_owner_id: string }
        Returns: undefined
      }
      update_hidden_space_appearance: {
        Args: { _theme?: Json; _wallpaper_url?: string }
        Returns: undefined
      }
      users_share_dm: { Args: { _a: string; _b: string }; Returns: boolean }
      verify_hidden_keyword: { Args: { _keyword: string }; Returns: boolean }
      verify_hidden_pin: { Args: { _pin: string }; Returns: boolean }
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
