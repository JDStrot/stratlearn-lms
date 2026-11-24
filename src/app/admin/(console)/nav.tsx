"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/people", "People"],
  ["/admin/assign", "Assign training"],
  ["/admin/reports", "Reports"],
  ["/admin/badges", "Print badges"],
  ["/admin/settings", "Team settings"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Console" className="wrap overflow-x-auto">
      <ul className="label flex gap-1 whitespace-nowrap pb-2">
        {LINKS.map(([href, text]) => {
          const on = href === "/admin" ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-full px-4 no-underline transition ${
                  on ? "bg-plum text-white" : "text-plum hover:bg-mist"
                }`}
              >
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
