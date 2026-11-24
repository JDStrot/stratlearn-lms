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

export function AdminNav({ owner = false }: { owner?: boolean }) {
  const path = usePathname();
  const links: (readonly [string, string])[] = owner ? [...LINKS, ["/admin/owner", "★ Owner portal"] as const] : [...LINKS];
  return (
    <nav aria-label="Console" className="wrap overflow-x-auto">
      <ul className="label flex gap-1 whitespace-nowrap pb-2">
        {links.map(([href, text]) => {
          const on = href === "/admin" ? path === href : path.startsWith(href) && !(href === "/admin/owner" ? false : path.startsWith("/admin/owner"));
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
