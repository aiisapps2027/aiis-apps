import {
  BookOpen, BookMarked, RotateCcw, Mic, ClipboardCheck, Volume2, Star, Wallet, Banknote, User, Search, Bookmark, Trophy,
  type LucideIcon,
} from "lucide-react";

// Tashih is hidden until the foundation decides how it should work (re-add { slug: "tashih", label: "Tashih", icon: PenLine }).
export type Feature = { slug: string; label: string; icon: LucideIcon; to?: string };

export const DASHBOARD_FEATURES: Feature[] = [
  { slug: "al-quran", to: "/ortu/quran", label: "Al-Qur'an", icon: BookOpen },
  { slug: "tahfiz", to: "/ortu/tahfiz", label: "Tahfiz", icon: BookMarked },
  { slug: "murojaah", to: "/ortu/murojaah", label: "Murojaah", icon: RotateCcw },
  { slug: "tahsin", to: "/ortu/tahsin", label: "Tahsin", icon: Mic },
  { slug: "munaqasyah", to: "/ortu/munaqasyah", label: "Munaqasyah", icon: ClipboardCheck },
  { slug: "tasmi", to: "/ortu/tasmi", label: "Tasmi'", icon: Volume2 },
  { slug: "bintang", to: "/ortu/bintang", label: "Bintang", icon: Star },
  { slug: "spp", to: "/ortu/spp", label: "SPP", icon: Wallet },
  { slug: "uang-saku", label: "Uang Saku", icon: Banknote },
  { slug: "eskul", to: "/ortu/eskul", label: "Eskul", icon: Trophy },
  { slug: "profil", label: "Profil", icon: User, to: "/ortu/profil" },
];

export const FEATURE_GROUPS: { title: string; items: Feature[] }[] = [
  {
    title: "Al-Qur'an",
    items: [
      { slug: "al-quran", to: "/ortu/quran", label: "Baca Al-Qur'an", icon: BookOpen },
      { slug: "cari-surah", to: "/ortu/quran", label: "Cari Surah / Ayat", icon: Search },
      { slug: "penanda", to: "/ortu/quran/penanda", label: "Penanda Ayat", icon: Bookmark },
    ],
  },
  {
    title: "Laporan Harian",
    items: [
      { slug: "tahfiz", to: "/ortu/tahfiz", label: "Tahfiz", icon: BookMarked },
      { slug: "murojaah", to: "/ortu/murojaah", label: "Murojaah", icon: RotateCcw },
      { slug: "tahsin", to: "/ortu/tahsin", label: "Tahsin", icon: Mic },
    ],
  },
  {
    title: "Ujian & Kegiatan",
    items: [
      { slug: "munaqasyah", to: "/ortu/munaqasyah", label: "Munaqasyah", icon: ClipboardCheck },
      { slug: "tasmi", to: "/ortu/tasmi", label: "Tasmi'", icon: Volume2 },
      { slug: "eskul", to: "/ortu/eskul", label: "Eskul", icon: Trophy },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { slug: "spp", to: "/ortu/spp", label: "SPP", icon: Wallet },
      { slug: "bintang", to: "/ortu/bintang", label: "Bintang", icon: Star },
      { slug: "uang-saku", label: "Uang Saku", icon: Banknote },
    ],
  },
];

export const featureLabel = (slug: string) =>
  [...DASHBOARD_FEATURES, ...FEATURE_GROUPS.flatMap((g) => g.items)].find((f) => f.slug === slug)?.label ?? "Fitur";
