import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Search, Upload, Pencil, KeyRound, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/aiis/StaffShell";
import { Avatar, StatusChip } from "@/components/aiis/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createStudent, deletePerson, importStudents, resetStudentLogin, updateStudent } from "@/lib/admin.functions";
import { isValidNik, isValidPhone, normalizeName, normalizePhone } from "@/lib/auth-utils";

export const Route = createFileRoute("/admin/siswa")({ component: AdminSiswa });

type Student = {
  id: string; nis: string | null; nama: string; nik: string; no_hp: string; jenjang: string; kelas: string | null;
  halaqah_id: string | null; jenis_kelamin: string; target_hafalan: string | null; nama_wali: string | null; aktif: boolean;
  foto_url: string | null; user_id: string | null;
};

const ALL = "__all";

function AdminSiswa() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [jenjang, setJenjang] = useState(ALL);
  const [kelas, setKelas] = useState(ALL);
  const [halaqah, setHalaqah] = useState(ALL);
  const [edit, setEdit] = useState<Partial<Student> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const resetFn = useServerFn(resetStudentLogin);
  const delFn = useServerFn(deletePerson);

  const { data } = useQuery({
    queryKey: ["admin-siswa"],
    queryFn: async () => {
      const [{ data: s }, { data: h }] = await Promise.all([
        supabase.from("students").select("*").order("nama"),
        supabase.from("halaqah").select("id, nama, jenjang").order("nama"),
      ]);
      return { students: (s ?? []) as Student[], halaqah: h ?? [] };
    },
  });
  const hName = (id: string | null) => data?.halaqah.find((h) => h.id === id)?.nama ?? "-";
  const kelasList = useMemo(() => [...new Set((data?.students ?? []).map((s) => s.kelas).filter(Boolean))].sort() as string[], [data]);
  const list = (data?.students ?? []).filter(
    (s) =>
      (jenjang === ALL || s.jenjang === jenjang) &&
      (kelas === ALL || s.kelas === kelas) &&
      (halaqah === ALL || s.halaqah_id === halaqah) &&
      (normalizeName(s.nama).includes(normalizeName(q)) || (s.nis ?? "").includes(q)),
  );
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-siswa"] });

  const actions = (s: Student) => (
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" aria-label="Ubah" onClick={() => setEdit(s)}><Pencil className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" aria-label="Reset login" onClick={async () => {
        try { await resetFn({ data: { id: s.id } }); toast.success("Login direset: No. HP + NIK"); refresh(); } catch (e: any) { toast.error(e.message); }
      }}><KeyRound className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" aria-label="Hapus" onClick={async () => {
        if (!confirm(`Hapus ${s.nama} beserta akun loginnya?`)) return;
        try { await delFn({ data: { table: "students", id: s.id } }); toast.success("Siswa dihapus"); refresh(); } catch (e: any) { toast.error(e.message); }
      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Data Siswa"
        subtitle={`${data?.students.length ?? 0} siswa terdaftar`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" className="rounded-xl" onClick={() => setImportOpen(true)}><Upload className="mr-1 h-4 w-4" /> Impor CSV</Button>
            <Button variant="secondary" className="rounded-xl lg:bg-primary lg:text-primary-foreground" onClick={() => setEdit({ jenjang: "SD", jenis_kelamin: "L", aktif: true })}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>
          </div>
        }
      />
      <div className="space-y-4 p-4 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari nama / NIS" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl bg-card pl-9" />
          </div>
          <div className="flex gap-1 rounded-xl bg-card p-1">
            {[ALL, "TK", "SD"].map((j) => (
              <button key={j} onClick={() => setJenjang(j)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${jenjang === j ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {j === ALL ? "Semua" : j}
              </button>
            ))}
          </div>
          <Select value={kelas} onValueChange={setKelas}>
            <SelectTrigger className="w-32 rounded-xl bg-card"><SelectValue placeholder="Kelas" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Semua kelas</SelectItem>{kelasList.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={halaqah} onValueChange={setHalaqah}>
            <SelectTrigger className="w-44 rounded-xl bg-card"><SelectValue placeholder="Halaqah" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Semua halaqah</SelectItem>{data?.halaqah.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="hidden rounded-2xl bg-card shadow-soft lg:block">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>NIS</TableHead><TableHead>Jenjang</TableHead><TableHead>Kelas</TableHead><TableHead>Halaqah</TableHead><TableHead>No. HP</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nama}</TableCell>
                  <TableCell>{s.nis ?? "-"}</TableCell>
                  <TableCell>{s.jenjang}</TableCell>
                  <TableCell>{s.kelas ?? "-"}</TableCell>
                  <TableCell>{hName(s.halaqah_id)}</TableCell>
                  <TableCell>{s.no_hp}</TableCell>
                  <TableCell><StatusChip status={s.aktif ? "aktif" : "nonaktif"} /></TableCell>
                  <TableCell>{actions(s)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 lg:hidden">
          {list.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <Avatar name={s.nama} url={s.foto_url} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.nama}</p>
                <p className="truncate text-xs text-muted-foreground">{s.jenjang} • {s.kelas ?? "-"} • {hName(s.halaqah_id)}</p>
                <div className="mt-1"><StatusChip status={s.aktif ? "aktif" : "nonaktif"} /></div>
              </div>
              {actions(s)}
            </div>
          ))}
        </div>
        {data && list.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada siswa.</p>}
      </div>
      {edit && <StudentDialog value={edit} halaqah={data?.halaqah ?? []} onClose={() => setEdit(null)} onSaved={refresh} />}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={refresh} />
    </div>
  );
}

function StudentDialog({ value, halaqah, onClose, onSaved }: { value: Partial<Student>; halaqah: { id: string; nama: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<Student>>(value);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createStudent);
  const update = useServerFn(updateStudent);
  const set = (k: keyof Student) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const NONE = "__none";

  async function save() {
    setBusy(true);
    const payload = {
      nis: f.nis ?? "", nama: f.nama ?? "", nik: f.nik ?? "", no_hp: f.no_hp ?? "", jenjang: (f.jenjang ?? "SD") as "TK" | "SD",
      kelas: f.kelas ?? "", jenis_kelamin: (f.jenis_kelamin ?? "L") as "L" | "P", nama_wali: f.nama_wali ?? "",
      target_hafalan: f.target_hafalan ?? "", halaqah_id: f.halaqah_id || null,
    };
    try {
      if (f.id) await update({ data: { ...payload, id: f.id, aktif: f.aktif ?? true } });
      else await create({ data: payload });
      toast.success("Data siswa disimpan");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message?.startsWith("[") ? "Periksa kembali isian (NIK 16 digit, No. HP valid)" : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Ubah Siswa" : "Tambah Siswa"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nama Murid</Label><Input value={f.nama ?? ""} onChange={set("nama")} /></div>
          <div><Label>NIS</Label><Input value={f.nis ?? ""} onChange={set("nis")} /></div>
          <div><Label>NIK (16 digit)</Label><Input inputMode="numeric" value={f.nik ?? ""} onChange={set("nik")} /></div>
          <div><Label>No. HP Orang Tua</Label><Input inputMode="tel" value={f.no_hp ?? ""} onChange={set("no_hp")} /></div>
          <div><Label>Nama Wali</Label><Input value={f.nama_wali ?? ""} onChange={set("nama_wali")} /></div>
          <div><Label>Jenjang</Label>
            <Select value={f.jenjang ?? "SD"} onValueChange={(v) => setF({ ...f, jenjang: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TK">TK</SelectItem><SelectItem value="SD">SD</SelectItem></SelectContent></Select>
          </div>
          <div><Label>Kelas</Label><Input placeholder="mis. 3A" value={f.kelas ?? ""} onChange={set("kelas")} /></div>
          <div><Label>Jenis Kelamin</Label>
            <Select value={f.jenis_kelamin ?? "L"} onValueChange={(v) => setF({ ...f, jenis_kelamin: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select>
          </div>
          <div><Label>Target Hafalan</Label><Input placeholder="mis. Juz 30" value={f.target_hafalan ?? ""} onChange={set("target_hafalan")} /></div>
          <div className="col-span-2"><Label>Halaqah</Label>
            <Select value={f.halaqah_id ?? NONE} onValueChange={(v) => setF({ ...f, halaqah_id: v === NONE ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NONE}>Belum ada</SelectItem>{halaqah.map((h) => <SelectItem key={h.id} value={h.id}>{h.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {f.id && (
            <div className="col-span-2 flex items-center justify-between rounded-xl bg-muted p-3">
              <Label>Aktif (bisa login)</Label><Switch checked={f.aktif ?? true} onCheckedChange={(v) => setF({ ...f, aktif: v })} />
            </div>
          )}
          <p className="col-span-2 text-xs text-muted-foreground">Orang tua masuk dengan Nama Murid + No. HP + NIK.</p>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CSV_COLS = ["nis", "nama", "nik", "no_hp", "jenjang", "kelas", "jenis_kelamin", "nama_wali", "target_hafalan"] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === ";") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

function validateRow(r: any): string[] {
  const e: string[] = [];
  if (!r.nama || r.nama.trim().length < 2) e.push("nama kosong");
  if (!isValidNik(r.nik ?? "")) e.push("NIK harus 16 digit");
  if (!isValidPhone(r.no_hp ?? "")) e.push("No. HP tidak valid");
  if (!["TK", "SD"].includes((r.jenjang ?? "").toUpperCase())) e.push("jenjang harus TK/SD");
  if (r.jenis_kelamin && !["L", "P"].includes(r.jenis_kelamin.toUpperCase())) e.push("jenis_kelamin L/P");
  return e;
}

function ImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const run = useServerFn(importStudents);

  async function onFile(file: File) {
    const text = await file.text();
    const [head = [], ...body] = parseCsv(text.replace(/^\uFEFF/, ""));
    const cols = head.map((h) => h.trim().toLowerCase());
    const parsed = body.map((cells) => {
      const r: any = {};
      cols.forEach((c, i) => (r[c] = (cells[i] ?? "").trim()));
      const seen = validateRow(r);
      return { ...r, _err: seen };
    });
    const phones = new Map<string, number>(), niks = new Map<string, number>();
    parsed.forEach((r: any) => {
      const p = normalizePhone(r.no_hp ?? "");
      if (phones.has(p)) r._err.push("No. HP ganda di file"); else phones.set(p, 1);
      if (niks.has(r.nik)) r._err.push("NIK ganda di file"); else niks.set(r.nik, 1);
    });
    setRows(parsed);
    setResults({});
  }

  const valid = rows.filter((r) => r._err.length === 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setRows([]); setResults({}); } }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Impor Siswa dari CSV</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Kolom: <code>{CSV_COLS.join(",")}</code></p>
        <Input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {rows.length > 0 && (
          <div className="max-h-80 overflow-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Nama</TableHead><TableHead>NIK</TableHead><TableHead>No. HP</TableHead><TableHead>Jenjang</TableHead><TableHead>Keterangan</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell><TableCell>{r.nama}</TableCell><TableCell>{r.nik}</TableCell><TableCell>{r.no_hp}</TableCell><TableCell>{r.jenjang}</TableCell>
                    <TableCell className={r._err.length || (results[i + 1] && results[i + 1] !== "ok") ? "text-destructive" : "text-success"}>
                      {r._err.length ? r._err.join(", ") : results[i + 1] ? (results[i + 1] === "ok" ? "Berhasil" : results[i + 1]) : "Siap"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={busy || valid.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                const idx = rows.map((r, i) => (r._err.length === 0 ? i : -1)).filter((i) => i >= 0);
                const payload = idx.map((i) => {
                  const r = rows[i];
                  return { ...Object.fromEntries(CSV_COLS.map((c) => [c, r[c] ?? ""])), jenjang: r.jenjang.toUpperCase(), jenis_kelamin: (r.jenis_kelamin || "L").toUpperCase() };
                });
                const { results: res } = await run({ data: { rows: payload } });
                const map: Record<number, string> = {};
                res.forEach((x, j) => (map[idx[j] + 1] = x.ok ? "ok" : x.error ?? "Gagal"));
                setResults(map);
                const ok = res.filter((x) => x.ok).length;
                toast.success(`${ok} dari ${res.length} siswa berhasil diimpor`);
                onDone();
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Impor {valid.length} siswa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
