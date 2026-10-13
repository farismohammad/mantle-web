"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="header-nav" aria-label="Primary navigation">
      {[
        ["/", "Agents"],
      ].map(([href, text]) => (
        <Link
          href={href}
          key={href}
          aria-current={
            href === "/"
              ? pathname === "/" || pathname.startsWith("/agents")
                ? "page"
                : undefined
              : pathname.startsWith(href)
                ? "page"
                : undefined
          }
        >
          {text}
        </Link>
      ))}
    </nav>
  );
}
