import type { Status } from "@/lib/status";
import { STATUS_LABEL } from "@/lib/status";

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const TONE: Record<Status, string> = {
  done: "border-success/40 bg-success/10 text-success",
  due: "border-lilac bg-white text-plum",
  overdue: "border-error/40 bg-error/10 text-error",
  renew: "border-violet/40 bg-violet/10 text-violet",
  expired: "border-error/40 bg-error/10 text-error",
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`chip ${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: "bad" | "good" }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <span className="label text-muted">{label}</span>
      <span className={`font-serif text-5xl leading-none ${tone === "bad" ? "text-error" : tone === "good" ? "text-success" : "text-plum"}`}>
        {value}
      </span>
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  );
}

export function Notice({ state }: { state: { error?: string; ok?: string } }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
        {state.ok}
      </p>
    );
  return null;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label text-plum">{label}</span>
      {children}
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </label>
  );
}
