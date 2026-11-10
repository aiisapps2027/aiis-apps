import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectionCard } from "@/components/aiis/SetoranForm";
import { emptySection, type SectionState } from "@/lib/laporan";
import type { JenisLaporan } from "@/lib/nilai";

afterEach(cleanup);

function Harness({ jenis, start }: { jenis: JenisLaporan; start?: Partial<SectionState> }) {
  const [s, setS] = useState<SectionState>({ ...emptySection(), on: true, ...start });
  return <SectionCard jenis={jenis} s={s} onChange={setS} />;
}

const radios = () => within(screen.getByRole("radiogroup", { name: "Nilai" })).getAllByRole("radio");
const checked = () => radios().map((r) => r.getAttribute("aria-checked"));

describe("SectionCard", () => {
  it("hides the fields while the section is switched off", () => {
    render(<Harness jenis="murojaah" start={{ on: false }} />);
    expect(screen.queryByRole("radiogroup", { name: "Nilai" })).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: /Isi Murojaah/ }));
    expect(screen.getByRole("radiogroup", { name: "Nilai" })).toBeInTheDocument();
  });

  it("selects L / L- / TL with one tap and clears on a second tap", () => {
    render(<Harness jenis="hafalan_baru" start={{ surahAwal: 72 }} />);
    expect(checked()).toEqual(["false", "false", "false"]);
    fireEvent.click(radios()[1]!);
    expect(checked()).toEqual(["false", "true", "false"]);
    fireEvent.click(radios()[1]!);
    expect(checked()).toEqual(["false", "false", "false"]);
  });

  it("derives the grade from the mistake count", () => {
    render(<Harness jenis="sabiq" start={{ surahAwal: 72 }} />);
    const salah = screen.getByPlaceholderText(/kosongkan/i);
    fireEvent.change(salah, { target: { value: "2" } });
    expect(checked()).toEqual(["true", "false", "false"]);
    fireEvent.change(salah, { target: { value: "4" } });
    expect(checked()).toEqual(["false", "true", "false"]);
    fireEvent.change(salah, { target: { value: "9" } });
    expect(checked()).toEqual(["false", "false", "true"]);
  });

  it("tapping a grade clears the typed mistake count so the two never disagree", () => {
    render(<Harness jenis="murojaah" start={{ surahAwal: 67, salah: "9" }} />);
    expect(checked()).toEqual(["false", "false", "true"]);
    fireEvent.click(radios()[0]!);
    expect(checked()).toEqual(["true", "false", "false"]);
    expect(screen.getByPlaceholderText(/kosongkan/i)).toHaveValue("");
  });

  it("shows the juz for the first ayat", () => {
    render(<Harness jenis="hafalan_baru" start={{ surahAwal: 72, ayatAwal: "12" }} />);
    expect(screen.getByText("Juz 29")).toBeInTheDocument();
  });

  it("shows the ayat limit of the chosen surah", () => {
    render(<Harness jenis="hafalan_baru" start={{ surahAwal: 72 }} />);
    expect(screen.getAllByPlaceholderText("1–28")).toHaveLength(2);
  });

  it("offers a second surah only after choosing 'Sampai surah lain'", () => {
    render(<Harness jenis="murojaah" start={{ surahAwal: 67 }} />);
    expect(screen.queryByText("Sampai surah")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sampai surah lain" }));
    expect(screen.getByText("Sampai surah")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Satu surah saja" }));
    expect(screen.queryByText("Sampai surah")).toBeNull();
  });

  it("tahsin asks for jilid and halaman instead of a surah", () => {
    render(<Harness jenis="tahsin" />);
    expect(screen.getByText("Jilid")).toBeInTheDocument();
    expect(screen.getByText("Halaman")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
