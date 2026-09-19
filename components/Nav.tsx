"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/todo", label: "やること" },
  { href: "/hospitals", label: "病院" },
  { href: "/money", label: "お金" },
  { href: "/", label: "入力" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="画面の切り替え" className="mx-auto flex max-w-xl gap-1.5 px-4 pt-4">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={path === i.href ? "page" : undefined}
          className={`inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-md border px-1 text-base ${
            path === i.href ? "border-blue-700 bg-blue-700 font-bold text-white" : "border-gray-300 bg-white text-info"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
