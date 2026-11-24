"use client";

import { useActionState, useState } from "react";
import { tabletLogin, type TabletState } from "./actions";

export function NamePicker({ people }: { people: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const shown = people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  if (picked) return <PinPad person={picked} onBack={() => setPicked(null)} />;

  return (
    <div className="flex flex-col gap-5">
      {people.length > 12 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type your name · Escribe tu nombre"
          aria-label="Find your name"
          className="field max-w-md !bg-white"
        />
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setPicked(p)}
              className="card card-hover flex min-h-[72px] w-full items-center justify-center px-4 font-serif text-2xl text-plum"
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p>No one by that name. Ask your manager to add you.</p>}
    </div>
  );
}

function PinPad({ person, onBack }: { person: { id: string; name: string }; onBack: () => void }) {
  const [state, action, pending] = useActionState<TabletState, FormData>(tabletLogin, {});
  const [pin, setPin] = useState("");
  const press = (d: string) => setPin((p) => (p.length < 8 ? p + d : p));

  return (
    <form action={action} className="card mx-auto flex w-full max-w-sm flex-col items-center gap-5 p-8 text-center">
      <input type="hidden" name="learnerId" value={person.id} />
      <input type="hidden" name="pin" value={pin} />
      <h2 className="text-4xl">Hi, <em>{person.name}</em></h2>
      <p className="text-muted">Type your PIN · Escribe tu PIN</p>
      <div aria-live="polite" aria-label={`${pin.length} digits entered`} className="flex h-6 gap-3">
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={`size-4 rounded-full ${i < pin.length ? "bg-plum" : "border-2 border-lilac"}`} />
        ))}
      </div>
      <div className="grid w-full grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="min-h-[64px] rounded-[14px] bg-mist font-serif text-3xl text-plum active:bg-lilac">
            {d}
          </button>
        ))}
        <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} className="label min-h-[64px] rounded-[14px] text-plum" aria-label="Delete">
          ⌫
        </button>
        <button type="button" onClick={() => press("0")} className="min-h-[64px] rounded-[14px] bg-mist font-serif text-3xl text-plum active:bg-lilac">
          0
        </button>
        <button disabled={pending || pin.length < 4} className="btn btn-primary min-h-[64px] !rounded-[14px] !px-2">
          Go
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-error">{state.error}</p>}
      <button type="button" onClick={onBack} className="label text-violet">← Not me</button>
    </form>
  );
}
