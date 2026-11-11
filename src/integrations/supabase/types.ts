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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          id: string
          isi: string
          judul: string
          tanggal_acara: string | null
          target: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          isi?: string
          judul: string
          tanggal_acara?: string | null
          target?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          isi?: string
          judul?: string
          tanggal_acara?: string | null
          target?: string
          updated_at?: string
        }
        Relationships: []
      }
      bintang: {
        Row: {
          created_at: string
          id: string
          jumlah: number
          keterangan: string
          student_id: string
          sumber_id: string
          sumber_tipe: string
          tanggal: string
        }
        Insert: {
          created_at?: string
          id?: string
          jumlah?: number
          keterangan: string
          student_id: string
          sumber_id: string
          sumber_tipe: string
          tanggal: string
        }
        Update: {
          created_at?: string
          id?: string
          jumlah?: number
          keterangan?: string
          student_id?: string
          sumber_id?: string
          sumber_tipe?: string
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "bintang_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      catatan_harian: {
        Row: {
          catatan: string | null
          created_at: string
          diketahui_ortu_at: string | null
          id: string
          kegiatan: string | null
          student_id: string
          tanggal: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          diketahui_ortu_at?: string | null
          id?: string
          kegiatan?: string | null
          student_id: string
          tanggal?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          diketahui_ortu_at?: string | null
          id?: string
          kegiatan?: string | null
          student_id?: string
          tanggal?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catatan_harian_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catatan_harian_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      halaqah: {
        Row: {
          created_at: string
          id: string
          jenjang: string
          nama: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jenjang: string
          nama: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jenjang?: string
          nama?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "halaqah_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      laporan_harian: {
        Row: {
          ayat_akhir: number | null
          ayat_awal: number | null
          created_at: string
          halaman: number | null
          id: string
          jenis: string
          jilid: string | null
          jumlah_salah: number | null
          juz: number | null
          materi: string | null
          nilai: string
          student_id: string
          surah_akhir: number | null
          surah_awal: number | null
          tanggal: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          ayat_akhir?: number | null
          ayat_awal?: number | null
          created_at?: string
          halaman?: number | null
          id?: string
          jenis: string
          jilid?: string | null
          jumlah_salah?: number | null
          juz?: number | null
          materi?: string | null
          nilai: string
          student_id: string
          surah_akhir?: number | null
          surah_awal?: number | null
          tanggal?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          ayat_akhir?: number | null
          ayat_awal?: number | null
          created_at?: string
          halaman?: number | null
          id?: string
          jenis?: string
          jilid?: string | null
          jumlah_salah?: number | null
          juz?: number | null
          materi?: string | null
          nilai?: string
          student_id?: string
          surah_akhir?: number | null
          surah_awal?: number | null
          tanggal?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laporan_harian_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laporan_harian_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          aktif: boolean
          created_at: string
          foto_url: string | null
          halaqah_id: string | null
          id: string
          jenis_kelamin: string
          jenjang: string
          kelas: string | null
          nama: string
          nama_wali: string | null
          nisn: string
          nis: string | null
          no_hp: string
          target_hafalan: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          foto_url?: string | null
          halaqah_id?: string | null
          id?: string
          jenis_kelamin?: string
          jenjang: string
          kelas?: string | null
          nama: string
          nama_wali?: string | null
          nisn: string
          nis?: string | null
          no_hp: string
          target_hafalan?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aktif?: boolean
          created_at?: string
          foto_url?: string | null
          halaqah_id?: string | null
          id?: string
          jenis_kelamin?: string
          jenjang?: string
          kelas?: string | null
          nama?: string
          nama_wali?: string | null
          nisn?: string
          nis?: string | null
          no_hp?: string
          target_hafalan?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_halaqah_id_fkey"
            columns: ["halaqah_id"]
            isOneToOne: false
            referencedRelation: "halaqah"
            referencedColumns: ["id"]
          },
        ]
      }
      target_harian: {
        Row: {
          ayat_akhir: number | null
          ayat_awal: number | null
          catatan: string | null
          created_at: string
          halaman: number | null
          id: string
          jenis: string
          jilid: string | null
          materi: string | null
          student_id: string
          surah_akhir: number | null
          surah_awal: number | null
          tanggal: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          ayat_akhir?: number | null
          ayat_awal?: number | null
          catatan?: string | null
          created_at?: string
          halaman?: number | null
          id?: string
          jenis: string
          jilid?: string | null
          materi?: string | null
          student_id: string
          surah_akhir?: number | null
          surah_awal?: number | null
          tanggal: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          ayat_akhir?: number | null
          ayat_awal?: number | null
          catatan?: string | null
          created_at?: string
          halaman?: number | null
          id?: string
          jenis?: string
          jilid?: string | null
          materi?: string | null
          student_id?: string
          surah_akhir?: number | null
          surah_awal?: number | null
          tanggal?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_harian_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_harian_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          aktif: boolean
          created_at: string
          foto_url: string | null
          id: string
          jenis_kelamin: string
          kode: string
          nama: string
          no_hp: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          foto_url?: string | null
          id?: string
          jenis_kelamin?: string
          kode: string
          nama: string
          no_hp?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aktif?: boolean
          created_at?: string
          foto_url?: string | null
          id?: string
          jenis_kelamin?: string
          kode?: string
          nama?: string
          no_hp?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      student_bintang_total: {
        Row: {
          student_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bintang_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hitung_nilai: { Args: { _jumlah_salah: number }; Returns: string }
      is_my_student: { Args: { _student_id: string }; Returns: boolean }
      jakarta_today: { Args: never; Returns: string }
      my_student_halaqah_id: { Args: never; Returns: string }
      my_student_id: { Args: never; Returns: string }
      my_teacher_id: { Args: never; Returns: string }
      set_my_student_photo: { Args: { _path: string }; Returns: undefined }
      tandai_diketahui: { Args: { _tanggal: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "ustadz" | "ortu"
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
      app_role: ["admin", "ustadz", "ortu"],
    },
  },
} as const
