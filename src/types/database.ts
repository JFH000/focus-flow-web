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

export interface ChatWithMessages extends Chat {
  messages: Message[]
}

export interface MessageWithFiles extends Message {
  files?: File[]
}


