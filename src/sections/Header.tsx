import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Heart } from "lucide-react";

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
  const { user, isLoggedIn, logout } = useAuth();

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
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img
              src="/logo-full.png"
              alt="Ай, настойка!"
              className="h-14 md:h-[72px] w-auto"
            />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-3">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="px-4 py-2 text-base md:text-lg font-medium rounded-lg transition-all hover:opacity-70"
                style={{
                  color: isActive(item.href) ? "var(--accent)" : "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  background: isActive(item.href) ? "var(--surface)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}

            {/* Donate */}
            <a
              href="https://boosty.to/ainastoika"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              title="Поддержать проект"
            >
              <Heart size={16} />
              <span className="hidden lg:inline">Поддержать</span>
            </a>

            {/* Auth */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2 ml-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-70"
                  style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  <User size={16} />
                  {user?.name || user?.email}
                </Link>
                <button
                  onClick={logout}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  title="Выйти"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-2 px-4 py-2 rounded-lg text-base font-medium transition-all hover:opacity-70"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                Вход
              </Link>
            )}
          </nav>

          {/* Mobile: profile + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {isLoggedIn ? (
              <button
                onClick={logout}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <LogOut size={16} />
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Вход
              </Link>
            )}
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
          {isLoggedIn && (
            <Link
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-2.5 text-base font-medium"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              <User size={20} />
              {user?.name || user?.email}
            </Link>
          )}
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
          <div style={{ borderBottom: "1px solid var(--border)", margin: "4px 0" }} />
          <a
            href="https://boosty.to/ainastoika"
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 py-2.5 text-base font-medium"
            style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            <Heart size={18} />
            Поддержать проект
          </a>
          {!isLoggedIn && (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-base font-medium"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              Вход / Регистрация
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
