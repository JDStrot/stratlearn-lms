"use client";

import { useEffect } from "react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
      Print
    </button>
  );
}

/** Writes one-time PINs from the URL hash (#pins=id:1234,...) onto the badges. */
export function FillPins() {
  useEffect(() => {
    const m = window.location.hash.match(/pins=([^&]+)/);
    if (!m) return;
    for (const pair of m[1].split(",")) {
      const [id, pin] = pair.split(":");
      if (!/^[0-9]{4,8}$/.test(pin ?? "")) continue;
      const slot = document.querySelector(`[data-id="${CSS.escape(id)}"] .pin-slot`);
      if (slot) slot.textContent = pin;
    }
    // Drop the PINs from the address bar and history once they're on the page.
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  return null;
}
