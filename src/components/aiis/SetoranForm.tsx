import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/aiis/decor";
import { NilaiBadge, NilaiPicker } from "@/components/aiis/NilaiBadge";
import { SurahPicker } from "@/components/aiis/SurahPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  effectiveNilai, emptySection, formatTanggal, isEditableDate, saveLaporan, sectionFromRow, validateSection,
  describeMaterial, targetFromRow, type LaporanRow, type MaterialState, type SectionState, type TargetRow, type TargetState, sectionFromTarget,
} from "@/lib/laporan";
import { JENIS_LABEL, JENIS_ORDER, type JenisLaporan } from "@/lib/nilai";
import { getSurah, juzOf } from "@/lib/quran";

const HINT: Record<JenisLaporan, string> = {
  hafalan_baru: "Hafalan yang baru disetor hari ini",
  sabiq: "Mengulang hafalan yang baru dihafal",
  murojaah: "Mengulang hafalan lama",
  tahsin: "Bacaan per jilid dan halaman",
};

type Sections = Record<JenisLaporan, SectionState>;

type FormProps = {
  student: { id: string; nama: string; kelas: string | null; foto_url: string | null };
  tanggal: string;
  halaqahId: string;
  teacherId: string | null;
  initial: LaporanRow[];
  targets: TargetRow[];
  catatanRow: { kegiatan: string | null; catatan: string | null } | null;
  next: { id: string; nama: string } | null;
};

export function SetoranForm({ student, tanggal, halaqahId, teacherId, initial, targets, catatanRow, next }: FormProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sections, setSections] = useState<Sections>(() => {
    const s = Object.fromEntries(JENIS_ORDER.map((j) => [j, emptySection()])) as Sections;
    for (const r of initial) if (r.jenis in s) s[r.jenis as JenisLaporan] = sectionFromRow(r);
    return s;
  });
  const [kegiatan, setKegiatan] = useState(catatanRow?.kegiatan ?? "");
  const [catatan, setCatatan] = useState(catatanRow?.catatan ?? "");
  const [busy, setBusy] = useState(false);
  const editable = isEditableDate(tanggal);

  async function save(goNext: boolean) {
    if (!teacherId) return void toast.error("Akun ustadz tidak ditemukan");
    for (const j of JENIS_ORDER) {
      if (!sections[j].on) continue;
      const err = validateSection(j, sections[j]);
      if (err) return void toast.error(`${JENIS_LABEL[j]}: ${err}`);
    }
    setBusy(true);
    try {
      await saveLaporan({ studentId: student.id, teacherId, tanggal, sections, kegiatan, catatan, hadCatatan: !!catatanRow });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["setoran-laporan"] }),
        qc.invalidateQueries({ queryKey: ["setoran-form", student.id, tanggal] }),
      ]);
      toast.success(`Setoran ${student.nama} tersimpan`);
      if (goNext && next) navigate({ to: "/ustadz/setoran/$studentId", params: { studentId: next.id }, search: { tanggal, halaqah: halaqahId } });
      else navigate({ to: "/ustadz/setoran", search: { tanggal, halaqah: halaqahId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
        <Avatar name={student.nama} url={student.foto_url} size={52} />
        <div className="min-w-0">
          <p className="break-words text-lg font-bold leading-snug">{student.nama}</p>
          <p className="text-xs text-muted-foreground">Kelas {student.kelas ?? "-"} • {formatTanggal(tanggal)}</p>
        </div>
      </div>
      {!editable && <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">Tanggal ini di luar batas input (maksimal 7 hari ke belakang). Data hanya bisa dilihat.</p>}

      {JENIS_ORDER.map((j) => (
        <SectionCard key={j} jenis={j} s={sections[j]} target={(() => { const t = targets.find((x) => x.jenis === j); return t ? targetFromRow(t) : undefined; })()} onChange={(v) => setSections((p) => ({ ...p, [j]: v }))} />
      ))}

      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <div>
          <Label htmlFor="kegiatan">Kegiatan hari ini</Label>
          <Input id="kegiatan" placeholder="mis. senam, praktik wudhu, eskul" value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} className="mt-1 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="catatan">Catatan guru</Label>
          <Textarea id="catatan" rows={3} placeholder="Catatan untuk orang tua" value={catatan} onChange={(e) => setCatatan(e.target.value)} className="mt-1 rounded-xl" />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[3.9rem] z-20 border-t bg-card/95 p-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button variant="outline" disabled={busy || !editable} onClick={() => save(false)} className="h-12 flex-1 rounded-xl">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan
          </Button>
          {next && (
            <Button disabled={busy || !editable} onClick={() => save(true)} className="h-12 flex-[1.4] rounded-xl">
              Simpan &amp; Lanjut
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


/** Surah + ayat range (or jilid + halaman for tahsin). Shared by the report form and the target editor. */
export function MaterialFields<T extends MaterialState>({ jenis, s, onChange }: { jenis: JenisLaporan; s: T; onChange: (patch: Partial<MaterialState>) => void }) {
  const set = onChange;
  const awal = s.surahAwal ? getSurah(s.surahAwal) : undefined;
  const akhir = s.lintas && s.surahAkhir ? getSurah(s.surahAkhir) : awal;
  const juz = s.surahAwal && Number(s.ayatAwal) >= 1 && awal && Number(s.ayatAwal) <= awal.ayat ? juzOf(s.surahAwal, Number(s.ayatAwal)) : null;
  return (
    <div className="space-y-3">
      {jenis === "tahsin" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Jilid</Label><Input placeholder="mis. 2A" value={s.jilid} onChange={(e) => set({ jilid: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>
                <div><Label>Halaman</Label><Input inputMode="numeric" placeholder="mis. 17" value={s.halaman} onChange={(e) => set({ halaman: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>
              </div>
              <div><Label>Materi (opsional)</Label><Input placeholder="mis. Makharijul huruf" value={s.materi} onChange={(e) => set({ materi: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>
            </>
          ) : (
            <>
              <div>
                <Label>{s.lintas ? "Dari surah" : "Surah"}</Label>
                <div className="mt-1"><SurahPicker value={s.surahAwal} onChange={(no) => set({ surahAwal: no })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Ayat dari</Label><Input inputMode="numeric" placeholder={awal ? `1–${awal.ayat}` : "ayat"} value={s.ayatAwal} onChange={(e) => set({ ayatAwal: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>
                {!s.lintas && <div><Label>Sampai ayat</Label><Input inputMode="numeric" placeholder={awal ? `1–${awal.ayat}` : "ayat"} value={s.ayatAkhir} onChange={(e) => set({ ayatAkhir: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>}
              </div>
              {s.lintas && (
                <>
                  <div><Label>Sampai surah</Label><div className="mt-1"><SurahPicker value={s.surahAkhir} onChange={(no) => set({ surahAkhir: no })} /></div></div>
                  <div><Label>Sampai ayat</Label><Input inputMode="numeric" placeholder={akhir ? `1–${akhir.ayat}` : "ayat"} value={s.ayatAkhir} onChange={(e) => set({ ayatAkhir: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>
                </>
              )}
              <div className="flex items-center justify-between text-xs">
                <button type="button" className="font-medium text-brand" onClick={() => set({ lintas: !s.lintas, surahAkhir: null })}>
                  {s.lintas ? "Satu surah saja" : "Sampai surah lain"}
                </button>
                {juz && <span className="rounded-full bg-secondary px-2.5 py-0.5 font-semibold text-primary">Juz {juz}</span>}
              </div>
            </>
          )}
    </div>
  );
}

export function SectionCard({ jenis, s, onChange, target }: { jenis: JenisLaporan; s: SectionState; onChange: (v: SectionState) => void; target?: TargetState | undefined }) {
  const nilai = effectiveNilai(s);
  const set = (patch: Partial<SectionState>) => onChange({ ...s, ...patch });

  return (
    <section className="rounded-2xl bg-card shadow-soft">
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{JENIS_LABEL[jenis]}</h2>
          <p className="text-xs text-muted-foreground">{HINT[jenis]}</p>
        </div>
        {s.on && nilai && <NilaiBadge nilai={nilai} />}
        <Switch checked={s.on} onCheckedChange={(on) => set({ on })} aria-label={`Isi ${JENIS_LABEL[jenis]}`} />
      </div>
      {!s.on && target && (
        <div className="flex items-center justify-between gap-3 border-t bg-secondary/60 px-4 py-2.5">
          <p className="min-w-0 break-words text-xs"><span className="font-semibold">Target:</span> {describeMaterial(jenis, target)}</p>
          <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-lg" onClick={() => onChange({ ...sectionFromTarget(target), existingId: s.existingId })}>Isi dari target</Button>
        </div>
      )}
      {s.on && (
        <div className="space-y-3 border-t p-4">
          <MaterialFields jenis={jenis} s={s} onChange={(patch) => set(patch)} />

          <div>
            <Label className="mb-1 block">Nilai</Label>
            <NilaiPicker value={nilai} onChange={(v) => set({ nilai: v, salah: "" })} />
          </div>
          <div>
            <Label>Jumlah salah (opsional)</Label>
            <Input inputMode="numeric" placeholder="kosongkan jika tidak dihitung" value={s.salah} onChange={(e) => set({ salah: e.target.value })} className="mt-1 h-11 rounded-xl" />
            <p className="mt-1 text-xs text-muted-foreground">Kalau diisi, nilai dihitung otomatis: 0–3 = L, 4–5 = L-, 6 atau lebih = TL.</p>
          </div>
        </div>
      )}
    </section>
  );
}
