import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const inserted: unknown[] = [];

vi.mock("@/lib/queries", () => ({
  myStudentQuery: queryOptions({ queryKey: ["my-student"], queryFn: async () => ({ id: "s1", nama: "A" }) }),
  formatDate: (s: string) => s,
}));
vi.mock("@/lib/ortu-queries", () => ({
  laporanQuery: queryOptions({
    queryKey: ["ortu-laporan"],
    queryFn: async () => [{ jenis: "hafalan_baru", nilai: "L", surah_awal: 72, ayat_awal: 1, surah_akhir: 72, ayat_akhir: 2 }],
  }),
  penandaQuery: queryOptions({ queryKey: ["ortu-penanda"], queryFn: async () => [{ id: "p1", surah: 72, ayat: 3, created_at: "" }] }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: async (row: unknown) => (inserted.push(row), { error: null }), delete: () => ({ eq: async () => ({ error: null }) }) }) },
}));

import { QuranReader } from "@/components/aiis/QuranReader";

const ayat = (n: number) => ({ nomorAyat: n, teksArab: `ARAB-${n}`, teksLatin: `latin-${n}`, teksIndonesia: `arti-${n}`, audio: { "05": `https://x/${n}.mp3` } });

beforeEach(() => {
  inserted.length = 0;
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ data: { nomor: 72, nama: "الجن", namaLatin: "Al-Jinn", jumlahAyat: 3, tempatTurun: "Mekah", arti: "Jin", ayat: [ayat(1), ayat(2), ayat(3)], suratSebelumnya: { nomor: 71, namaLatin: "Nuh" }, suratSelanjutnya: { nomor: 73, namaLatin: "Al-Muzzammil" } } }),
  })));
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderReader() {
  const root = createRootRoute({ component: () => <QuranReader no={72} startAyat={null} /> });
  const any = createRoute({ getParentRoute: () => root, path: "$", component: () => null });
  const router = createRouter({ routeTree: root.addChildren([any]), history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByText("ARAB-1");
}

describe("QuranReader", () => {
  it("shows every ayat with Arabic, latin and translation", async () => {
    await renderReader();
    for (const n of [1, 2, 3]) {
      expect(screen.getByText(`ARAB-${n}`)).toBeInTheDocument();
      expect(screen.getByText(`latin-${n}`)).toBeInTheDocument();
      expect(screen.getByText(`arti-${n}`)).toBeInTheDocument();
    }
    expect(screen.getByText("Al-Jinn", { selector: "p" })).toBeInTheDocument();
  });

  it("marks memorised ayat from the reports", async () => {
    await renderReader();
    await waitFor(() => expect(screen.getAllByText("Sudah dihafal")).toHaveLength(2));
    expect(screen.getByText("2 dari 3 ayat sudah dihafal")).toBeInTheDocument();
  });

  it("hides latin and translation with the toggles", async () => {
    await renderReader();
    fireEvent.click(screen.getByRole("switch", { name: "Latin" }));
    fireEvent.click(screen.getByRole("switch", { name: "Terjemah" }));
    expect(screen.queryByText("latin-1")).toBeNull();
    expect(screen.queryByText("arti-1")).toBeNull();
    expect(screen.getByText("ARAB-1")).toBeInTheDocument();
  });

  it("plays one ayat and shows the mini player", async () => {
    await renderReader();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Putar ayat 2" })); });
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByText("Ayat 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hentikan ayat 2" }));
    expect(screen.queryByText("Ayat 2")).toBeNull();
  });

  it("shows existing bookmarks and adds a new one", async () => {
    await renderReader();
    await waitFor(() => expect(screen.getByRole("button", { name: "Hapus penanda ayat 3" })).toHaveAttribute("aria-pressed", "true"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Tandai ayat 1" })); });
    await waitFor(() => expect(inserted).toEqual([{ student_id: "s1", surah: 72, ayat: 1 }]));
  });

  it("links to the previous and next surah", async () => {
    await renderReader();
    expect(screen.getByRole("link", { name: /Nuh/ })).toHaveAttribute("href", "/ortu/quran/71");
    expect(screen.getByRole("link", { name: /Al-Muzzammil/ })).toHaveAttribute("href", "/ortu/quran/73");
  });
});
