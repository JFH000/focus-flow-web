export interface Database {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string
          user_id: string
          title: string
          context_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          context_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          context_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      // Legacy table - being migrated to calendar.* tables
      calendar_events: {
        Row: {
          id: string
          user_id: string
          google_event_id: string | null
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string
          all_day: boolean
          color_id: string | null
          color_hex: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          google_event_id?: string | null
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          color_id?: string | null
          color_hex?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          google_event_id?: string | null
          title?: string
          description?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          color_id?: string | null
          color_hex?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count: number | null
          model_used: string | null
          attached_files: string[]
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count?: number | null
          model_used?: string | null
          attached_files?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          token_count?: number | null
          model_used?: string | null
          attached_files?: string[]
          created_at?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          storage_path: string
          file_name: string
          mime_type: string | null
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          storage_path: string
          file_name: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
      }
    }
  }
  calendar: {
    Tables: {
      calendars: {
        Row: {
          id: string
          owner_id: string
          name: string
          color: string | null
          is_primary: boolean
          is_favorite: boolean
          is_visible: boolean
          external_provider: string | null // 'google' | 'outlook' | 'apple' | 'ics' | null
          external_provider_email: string | null // Email de la cuenta (personal@gmail.com, trabajo@empresa.com)
          external_calendar_id: string | null
          external_sync_token: string | null
          external_access_token: string | null
          external_refresh_token: string | null
          external_token_expires_at: string | null
          ics_url: string | null // URL del feed ICS
          ics_last_sync_at: string | null
          ics_sync_interval_minutes: number | null
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          color?: string | null
          is_primary?: boolean
          is_favorite?: boolean
          is_visible?: boolean
          external_provider?: string | null
          external_provider_email?: string | null
          external_calendar_id?: string | null
          external_sync_token?: string | null
          external_access_token?: string | null
          external_refresh_token?: string | null
          external_token_expires_at?: string | null
          ics_url?: string | null
          ics_last_sync_at?: string | null
          ics_sync_interval_minutes?: number | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          color?: string | null
          is_primary?: boolean
          is_favorite?: boolean
          is_visible?: boolean
          external_provider?: string | null
          external_provider_email?: string | null
          external_calendar_id?: string | null
          external_sync_token?: string | null
          external_access_token?: string | null
          external_refresh_token?: string | null
          external_token_expires_at?: string | null
          ics_url?: string | null
          ics_last_sync_at?: string | null
          ics_sync_interval_minutes?: number | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
      }
      connected_accounts: {
        Row: {
          id: string
          user_id: string
          provider: string
          provider_email: string
          provider_user_id: string | null
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          scopes: string[] | null
          is_active: boolean
          metadata: Record<string, any>
          created_at: string
          updated_at: string
          last_sync_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          provider_email: string
          provider_user_id?: string | null
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          is_active?: boolean
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
          last_sync_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          provider_email?: string
          provider_user_id?: string | null
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          is_active?: boolean
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
          last_sync_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          calendar_id: string
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string
          is_all_day: boolean
          timezone: string
          recurrence_rule: string | null
          external_event_id: string | null
          created_at: string
          updated_at: string
          metadata: Record<string, any>
        }
        Insert: {
          id?: string
          calendar_id: string
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time: string
          is_all_day?: boolean
          timezone?: string
          recurrence_rule?: string | null
          external_event_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
        Update: {
          id?: string
          calendar_id?: string
          title?: string
          description?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          is_all_day?: boolean
          timezone?: string
          recurrence_rule?: string | null
          external_event_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Record<string, any>
        }
      }
      attendees: {
        Row: {
          event_id: string
          user_id: string | null
          email: string
          status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS_ACTION'
          is_organizer: boolean
          metadata: Record<string, any>
        }
        Insert: {
          event_id: string
          user_id?: string | null
          email: string
          status?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS_ACTION'
          is_organizer?: boolean
          metadata?: Record<string, any>
        }
        Update: {
          event_id?: string
          user_id?: string | null
          email?: string
          status?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS_ACTION'
          is_organizer?: boolean
          metadata?: Record<string, any>
        }
      }
      reminders: {
        Row: {
          id: string
          event_id: string
          method: 'email' | 'popup' | 'sms'
          minutes_before: number
        }
        Insert: {
          id?: string
          event_id: string
          method: 'email' | 'popup' | 'sms'
          minutes_before: number
        }
        Update: {
          id?: string
          event_id?: string
          method?: 'email' | 'popup' | 'sms'
          minutes_before?: number
        }
      }
    }
  }
}

export type Chat = Database['public']['Tables']['chats']['Row']
export type ChatInsert = Database['public']['Tables']['chats']['Insert']
export type ChatUpdate = Database['public']['Tables']['chats']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type File = Database['public']['Tables']['files']['Row']
export type FileInsert = Database['public']['Tables']['files']['Insert']
export type FileUpdate = Database['public']['Tables']['files']['Update']

// Calendar types
export type Calendar = Database['calendar']['Tables']['calendars']['Row']
export type CalendarInsert = Database['calendar']['Tables']['calendars']['Insert']
export type CalendarUpdate = Database['calendar']['Tables']['calendars']['Update']

export type CalendarEvent = Database['calendar']['Tables']['events']['Row']
export type CalendarEventInsert = Database['calendar']['Tables']['events']['Insert']
export type CalendarEventUpdate = Database['calendar']['Tables']['events']['Update']

export type Attendee = Database['calendar']['Tables']['attendees']['Row']
export type AttendeeInsert = Database['calendar']['Tables']['attendees']['Insert']
export type AttendeeUpdate = Database['calendar']['Tables']['attendees']['Update']

export type Reminder = Database['calendar']['Tables']['reminders']['Row']
export type ReminderInsert = Database['calendar']['Tables']['reminders']['Insert']
export type ReminderUpdate = Database['calendar']['Tables']['reminders']['Update']

// TODO: Uncomment when connected_accounts table is added to database
// export type ConnectedAccount = Database['public']['Tables']['connected_accounts']['Row']
// export type ConnectedAccountInsert = Database['public']['Tables']['connected_accounts']['Insert']
// export type ConnectedAccountUpdate = Database['public']['Tables']['connected_accounts']['Update']

export interface ChatWithMessages extends Chat {
  messages: Message[]
}

export interface MessageWithFiles extends Message {
  files?: File[]
}

// Extended calendar types
export interface CalendarWithStats extends Calendar {
  event_count: number
  last_event_date?: string
}

export interface CalendarEventWithDetails extends CalendarEvent {
  calendar_name?: string
  calendar_color?: string
  calendar_provider?: string
  attendees?: Attendee[]
  reminders?: Reminder[]
}


