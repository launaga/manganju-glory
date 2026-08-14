// Generated from the live Supabase schema (Phase 3). Regenerate with:
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
// Trimmed to Row/Insert/Update per table (the shape supabase-js needs for a
// typed client). Kept in sync manually until CI generation is wired (Phase 10).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Status = 'draft' | 'published' | 'archived';

interface Timestamped { created_at: string; updated_at: string }

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: { user_id: string; email: string | null; created_at: string };
        Insert: { user_id: string; email?: string | null; created_at?: string };
        Update: { user_id?: string; email?: string | null; created_at?: string };
        Relationships: [];
      };
      contact_submissions: {
        Row: {
          id: string; name: string; email: string; subject: string | null;
          message: string; status: 'new' | 'read' | 'archived'; created_at: string; updated_at: string;
        };
        Insert: { name: string; email: string; message: string; subject?: string | null; status?: 'new' | 'read' | 'archived' };
        Update: Partial<{ name: string; email: string; subject: string | null; message: string; status: 'new' | 'read' | 'archived' }>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string; title: string; slug: string;
          short_description_id: string | null; short_description_en: string | null;
          description_id: string | null; description_en: string | null;
          category: string | null; year: number | null; client: string | null;
          project_url: string | null; cover_image: string | null;
          cover_alt_id: string | null; cover_alt_en: string | null;
          tags: string[]; featured: boolean; status: Status; display_order: number;
          seo_title: string | null; seo_description: string | null;
          created_at: string; updated_at: string; published_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['projects']['Row']> & { title: string; slug: string };
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
        Relationships: [];
      };
      project_images: {
        Row: {
          id: string; project_id: string; url: string;
          alt_id: string | null; alt_en: string | null;
          caption_id: string | null; caption_en: string | null;
          width: number | null; height: number | null; display_order: number; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['project_images']['Row']> & { project_id: string; url: string };
        Update: Partial<Database['public']['Tables']['project_images']['Row']>;
        Relationships: [];
      };
      experience: {
        Row: {
          id: string; company: string; role_id: string | null; role_en: string | null;
          description_id: string | null; description_en: string | null;
          start_date: string | null; end_date: string | null; location: string | null;
          company_logo: string | null; current_position: boolean; display_order: number;
          status: Status; created_at: string; updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['experience']['Row']> & { company: string };
        Update: Partial<Database['public']['Tables']['experience']['Row']>;
        Relationships: [];
      };
      skill_categories: {
        Row: { id: string; name_id: string | null; name_en: string | null; slug: string; display_order: number } & Timestamped;
        Insert: Partial<Database['public']['Tables']['skill_categories']['Row']> & { slug: string };
        Update: Partial<Database['public']['Tables']['skill_categories']['Row']>;
        Relationships: [];
      };
      skills: {
        Row: {
          id: string; category_id: string | null; name: string;
          description_id: string | null; description_en: string | null;
          icon: string | null; display_order: number; is_visible: boolean;
        } & Timestamped;
        Insert: Partial<Database['public']['Tables']['skills']['Row']> & { name: string };
        Update: Partial<Database['public']['Tables']['skills']['Row']>;
        Relationships: [];
      };
      testimonials: {
        Row: {
          id: string; name: string; role: string | null; company: string | null;
          quote_id: string | null; quote_en: string | null; avatar: string | null;
          featured: boolean; status: Status; display_order: number;
        } & Timestamped;
        Insert: Partial<Database['public']['Tables']['testimonials']['Row']> & { name: string };
        Update: Partial<Database['public']['Tables']['testimonials']['Row']>;
        Relationships: [];
      };
      blog_categories: {
        Row: { id: string; name: string; slug: string } & Timestamped;
        Insert: Partial<Database['public']['Tables']['blog_categories']['Row']> & { name: string; slug: string };
        Update: Partial<Database['public']['Tables']['blog_categories']['Row']>;
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string; title: string; slug: string; excerpt: string | null;
          content: string | null; featured_image: string | null; category_id: string | null;
          author: string | null; status: Status; published_at: string | null;
          seo_title: string | null; seo_description: string | null;
        } & Timestamped;
        Insert: Partial<Database['public']['Tables']['blog_posts']['Row']> & { title: string; slug: string };
        Update: Partial<Database['public']['Tables']['blog_posts']['Row']>;
        Relationships: [];
      };
      about: { Row: Record<string, Json | string | number | null>; Insert: Record<string, Json>; Update: Record<string, Json>; Relationships: [] };
      homepage: { Row: Record<string, Json | string | number | null>; Insert: Record<string, Json>; Update: Record<string, Json>; Relationships: [] };
      site_settings: { Row: Record<string, Json | string | number | null>; Insert: Record<string, Json>; Update: Record<string, Json>; Relationships: [] };
      seo_settings: { Row: Record<string, Json | string | number | null>; Insert: Record<string, Json>; Update: Record<string, Json>; Relationships: [] };
      pricing: { Row: Record<string, Json | string | number | null>; Insert: Record<string, Json>; Update: Record<string, Json>; Relationships: [] };
      stats: { Row: Record<string, Json | string | number | null>; Insert: Record<string, Json>; Update: Record<string, Json>; Relationships: [] };
      media: {
        Row: {
          id: string; file_name: string; storage_path: string; public_url: string;
          mime_type: string | null; file_size: number | null; width: number | null; height: number | null;
          alt_id: string | null; alt_en: string | null; folder: string; uploaded_by: string | null; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['media']['Row']> & { file_name: string; storage_path: string; public_url: string };
        Update: Partial<Database['public']['Tables']['media']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { content_status: Status };
    CompositeTypes: Record<string, never>;
  };
}

export type Status2 = Status;
