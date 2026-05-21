import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, User } from "lucide-react";

const navItems = [
  { label: "Рецепты", href: "/recipes" },
  { label: "Инструменты", href: "/tools" },
  { label: "Барная карта", href: "/barmap" },
  { label: "Правила", href: "/rules" },
  { label: "Обратная связь", href: "/feedback" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  return (
    <header
      className="sticky top-0 z-40 theme-transition"
      style={{
        background: "rgba(250, 246, 240, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Main header row */}
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo: icon + text */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo-icon.png"
              alt=""
              className="h-8 md:h-12 w-auto"
            />
            <span
              className="text-lg md:text-2xl font-bold leading-none"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              Ай, настойка!
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="px-3 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-70"
                style={{
                  color: isActive(item.href) ? "var(--accent)" : "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  background: isActive(item.href) ? "var(--surface)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/profile"
              className="ml-2 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <User size={20} />
            </Link>
          </nav>

          {/* Mobile: profile + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              to="/profile"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <User size={18} />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1"
              style={{ color: "var(--text-primary)" }}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 space-y-1" style={{ background: "var(--bg-primary)" }}>
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 py-2.5 text-base font-medium"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            <User size={20} />
            Личный кабинет
          </Link>
          <div style={{ borderBottom: "1px solid var(--border)", margin: "4px 0" }} />
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-base font-medium"
              style={{ color: isActive(item.href) ? "var(--accent)" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
