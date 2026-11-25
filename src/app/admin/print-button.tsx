"use client";

export function PrintSnapshot({ label = "Print or save PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
      {label}
    </button>
  );
}
