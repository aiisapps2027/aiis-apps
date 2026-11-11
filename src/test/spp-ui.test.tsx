import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toasts, rpcCalls, state } = vi.hoisted(() => ({
  toasts: [] as { type: string; msg: string }[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  state: { recent: [] as unknown[] },
}));
vi.mock("sonner", () => ({ toast: { error: (m: string) => toasts.push({ type: "error", msg: m }), success: (m: string) => toasts.push({ type: "success", msg: m }), info: () => {} } }));

const pending = [
  { id: "p1", nominal: 1300000, tanggal_transfer: "2026-11-10", nama_pengirim: "Budi", bank_pengirim: "BCA", bukti_path: "s1/a.jpg", status: "menunggu", tagihan: { judul: "SPP November 2026", jenis: "spp", jatuh_tempo: "2026-11-10" }, students: { nama: "Almahyra", kelas: "2B", jenjang: "SD" } },
];

// Thenable query-builder stand-in: every chained call returns itself, awaiting yields the rows.
const builder = (rows: unknown) => {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) b[m] = () => b;
  b["then"] = (res: (v: unknown) => unknown) => res({ data: rows, error: null });
  return b;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => (table === "pembayaran" ? { select: (cols: string) => (cols.includes("tagihan(") ? builder(pending) : builder(state.recent)) } : builder([])),
    rpc: async (fn: string, args: Record<string, unknown>) => (rpcCalls.push({ fn, args }), { error: null }),
    storage: { from: () => ({ createSignedUrl: async (p: string) => ({ data: { signedUrl: `https://signed/${p}` }, error: null }) }) },
  },
}));

const { prepare, upload, ajukan } = vi.hoisted(() => ({
  prepare: vi.fn(async () => ({ blob: new Blob(["x"]), hash: "hash-1" })),
  upload: vi.fn(async () => "s1/new.jpg"),
  ajukan: vi.fn(async (_i: unknown) => undefined),
}));
vi.mock("@/lib/spp", async (orig) => ({ ...(await orig<typeof import("@/lib/spp")>()), prepareBukti: prepare, uploadBukti: upload, ajukanPembayaran: ajukan }));

import { PembayaranForm } from "@/components/aiis/PembayaranForm";
import { SppKonfirmasi } from "@/components/aiis/SppKonfirmasi";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => { toasts.length = 0; rpcCalls.length = 0; state.recent = []; prepare.mockClear(); upload.mockClear(); ajukan.mockClear(); URL.createObjectURL = () => "blob:preview"; URL.revokeObjectURL = () => {}; });
afterEach(cleanup);

describe("PembayaranForm (parent)", () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Bank pengirim"), { target: { value: "BCA" } });
    fireEvent.change(screen.getByLabelText("Nama pengirim"), { target: { value: "Budi Santoso" } });
  };

  it("asks for the proof photo before sending anything", async () => {
    wrap(<PembayaranForm tagihanId="t1" studentId="s1" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Saya sudah bayar" }));
    await waitFor(() => expect(toasts[0]?.msg).toMatch(/foto bukti/i));
    expect(ajukan).not.toHaveBeenCalled();
  });

  it("uploads the proof then submits it for the right invoice", async () => {
    wrap(<PembayaranForm tagihanId="t1" studentId="s1" />);
    fill();
    fireEvent.change(screen.getByLabelText("Foto bukti transfer"), { target: { files: [new File(["img"], "bukti.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Saya sudah bayar" }));
    await waitFor(() => expect(ajukan).toHaveBeenCalledTimes(1));
    expect(upload).toHaveBeenCalledWith("s1", expect.any(Blob));
    expect(ajukan.mock.calls[0]![0]).toMatchObject({ tagihanId: "t1", bank: "BCA", nama: "Budi Santoso", path: "s1/new.jpg", hash: "hash-1" });
    await waitFor(() => expect(toasts.some((t) => t.type === "success")).toBe(true));
  });

  it("shows the server's reason when the proof was already used", async () => {
    ajukan.mockRejectedValueOnce(new Error("Bukti transfer ini sudah pernah dipakai"));
    wrap(<PembayaranForm tagihanId="t1" studentId="s1" />);
    fill();
    fireEvent.change(screen.getByLabelText("Foto bukti transfer"), { target: { files: [new File(["img"], "b.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Saya sudah bayar" }));
    await waitFor(() => expect(toasts.some((t) => t.msg === "Bukti transfer ini sudah pernah dipakai")).toBe(true));
  });
});

describe("SppKonfirmasi (admin)", () => {
  it("lists a waiting payment with who, what, how much and the proof", async () => {
    wrap(<SppKonfirmasi />);
    expect(await screen.findByText("Almahyra")).toBeInTheDocument();
    expect(screen.getByText("Rp 1.300.000")).toBeInTheDocument();
    expect(screen.getByText(/Dari Budi/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText("Bukti transfer")).toHaveAttribute("src", "https://signed/s1/a.jpg"));
    expect(screen.queryByText(/nominal dan tanggal transfer yang sama/)).toBeNull();
  });

  it("warns when another payment has the same amount and date", async () => {
    state.recent = [{ id: "p1", nominal: 1300000, tanggal_transfer: "2026-11-10", status: "menunggu" }, { id: "p9", nominal: 1300000, tanggal_transfer: "2026-11-10", status: "dikonfirmasi" }];
    wrap(<SppKonfirmasi />);
    expect(await screen.findByText(/nominal dan tanggal transfer yang sama/)).toBeInTheDocument();
  });

  it("confirms through the RPC", async () => {
    wrap(<SppKonfirmasi />);
    fireEvent.click(await screen.findByRole("button", { name: /Konfirmasi/ }));
    await waitFor(() => expect(rpcCalls).toEqual([{ fn: "putuskan_pembayaran", args: { _id: "p1", _setuju: true } }]));
  });

  it("will not reject without a reason", async () => {
    wrap(<SppKonfirmasi />);
    fireEvent.click(await screen.findByRole("button", { name: /^Tolak$/ }));
    const send = await screen.findByRole("button", { name: "Tolak pembayaran" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Alasan/), { target: { value: "ab" } });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Alasan/), { target: { value: "Nominal tidak sesuai" } });
    expect(send).toBeEnabled();
    fireEvent.click(send);
    await waitFor(() => expect(rpcCalls).toEqual([{ fn: "putuskan_pembayaran", args: { _id: "p1", _setuju: false, _alasan: "Nominal tidak sesuai" } }]));
  });
});
