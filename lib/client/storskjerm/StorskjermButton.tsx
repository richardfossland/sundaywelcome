"use client";

import { useState } from "react";
import { StorskjermPanel } from "./StorskjermPanel";
import { tekst } from "./tekst";
import "./storskjerm.css";

/** «Vis på storskjerm» — knapp som åpner veiviseren for skjerm-adressen `url`. */
export function StorskjermButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">▶︎</span> {tekst.knapp}
      </button>
      {open && <StorskjermPanel url={url} onClose={() => setOpen(false)} />}
    </>
  );
}
