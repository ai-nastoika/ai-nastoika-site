import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, User, LogOut, Shield, Bot, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Heart } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { DonateModal } from "@/components/DonateModal";

const navItems = [
  { label: "Рецепты", href: "/recipes" },
  { label: "Инструменты", href: "/tools" },
  { label: "Этикетка", href: "/label" },
  { label: "Барная карта", href: "/barmap" },
  { label: "Винокур", href: "/vinokur" },
  { label: "Правила", href: "/rules" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const location = useLocation();
  const { user, isLoggedIn, isAdmin, isEditor, logout } = useAuth();
  const { data: pendingCount } = trpc.adminStats.pendingCount.useQuery(undefined, { enabled: isAdmin, refetchInterval: 60000 });

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  return (
    <>
    <style>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
    <header
      className="sticky top-0 z-40 theme-transition print:hidden"
      style={{
        background: "rgba(250, 246, 240, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Row 1: логотип + профиль — всегда компактно, никогда не переносится */}
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img
              src="/logo-full.png"
              alt="Ай, настойка!"
              className="h-14 md:h-[72px] w-auto"
            />
          </Link>

          {/* Donate + Feedback + Auth — компактный блок, видим всегда на десктопе */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDonateOpen(true)}
              className="flex items-center justify-center w-8 h-8 lg:w-auto lg:h-auto lg:px-2 lg:py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 whitespace-nowrap"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              title="Поддержать проект"
            >
              <Heart size={14} />
              <span className="hidden lg:inline lg:ml-1">Поддержать</span>
            </button>

            <Link
              to="/feedback"
              className="flex items-center justify-center w-8 h-8 lg:w-auto lg:h-auto lg:px-2 lg:py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 whitespace-nowrap"
              style={{
                background: isActive("/feedback") ? "var(--accent)" : "var(--surface)",
                color: isActive("/feedback") ? "#fff" : "var(--accent)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
              title="Обратная связь"
            >
              <MessageCircle size={14} />
              <span className="hidden lg:inline lg:ml-1">Обратная связь</span>
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-1">
                <Link
                  to="/profile"
                  className="flex items-center justify-center w-8 h-8 lg:w-auto lg:h-auto lg:px-2 lg:py-1 rounded-lg text-xs font-medium transition-all hover:opacity-70 whitespace-nowrap"
                  style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  <User size={14} />
                  <span className="hidden lg:inline lg:ml-1">{user?.name || user?.email}</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  title="Выйти"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-2 py-1 rounded-lg text-xs lg:text-sm font-medium transition-all hover:opacity-70 whitespace-nowrap"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                Вход
              </Link>
            )}
          </div>

          {/* Mobile: profile + hamburger */}
          <div className="lg:hidden flex items-center gap-2">
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

        {/* Row 2: навигация — отдельная строка, переносится сама по себе если не влезает,
            не задевая логотип и профиль в Row 1 */}
        <nav className="hidden lg:flex items-center flex-wrap gap-1 lg:gap-2 pb-3">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="px-1.5 lg:px-2 py-1 text-xs lg:text-sm font-medium rounded-lg transition-all hover:opacity-70 whitespace-nowrap"
              style={{
                color: isActive(item.href) ? "var(--accent)" : "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                background: isActive(item.href) ? "var(--surface)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}

          {/* Парсер — для editor и admin */}
          {isEditor && (
            <Link
              to="/tools/parse-recipe"
              className="px-1.5 lg:px-2 py-1 text-xs lg:text-sm font-medium rounded-lg transition-all hover:opacity-70 whitespace-nowrap flex items-center gap-1"
              style={{
                color: isActive("/tools/parse-recipe") ? "#fff" : "var(--accent)",
                fontFamily: "var(--font-body)",
                background: isActive("/tools/parse-recipe") ? "var(--accent)" : "var(--surface)",
                border: "1px solid var(--accent)",
              }}
            >
              <Bot size={12} />
              Парсер
            </Link>
          )}

          {/* Парсер заведений — для editor и admin */}
          {isEditor && (
            <Link
              to="/tools/parse-place"
              className="px-1.5 lg:px-2 py-1 text-xs lg:text-sm font-medium rounded-lg transition-all hover:opacity-70 whitespace-nowrap flex items-center gap-1"
              style={{
                color: isActive("/tools/parse-place") ? "#fff" : "var(--accent)",
                fontFamily: "var(--font-body)",
                background: isActive("/tools/parse-place") ? "var(--accent)" : "var(--surface)",
                border: "1px solid var(--accent)",
              }}
            >
              <Bot size={12} />
              Парсер мест
            </Link>
          )}

          {/* Админка — для admin полностью, для editor доступны только вкладки Рецепты/Места внутри */}
          {isEditor && (
            <Link
              to="/admin"
              className="relative px-1.5 lg:px-2 py-1 text-xs lg:text-sm font-medium rounded-lg transition-all hover:opacity-70 whitespace-nowrap flex items-center gap-1"
              style={{
                color: isActive("/admin") ? "#fff" : "var(--accent)",
                fontFamily: "var(--font-body)",
                background: isActive("/admin") ? "var(--accent)" : "var(--surface)",
                border: "1px solid var(--accent)",
              }}
            >
              <Shield size={12} />
              Админ
              {!!pendingCount?.total && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold"
                  style={{ background: "#dc2626", fontSize: "10px", minWidth: "16px", height: "16px", padding: "0 3px", lineHeight: 1 }}
                  title={`Обращения: ${pendingCount.feedback} · Рецепты на модерации: ${pendingCount.recipes} · Заявки на заведения: ${pendingCount.places}`}
                >
                  {pendingCount.total > 99 ? "99+" : pendingCount.total}
                </span>
              )}
            </Link>
          )}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden px-4 pb-4 space-y-1" style={{ background: "var(--bg-primary)" }}>
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

          {/* Парсер в мобильном меню */}
          {isEditor && (
            <Link
              to="/tools/parse-recipe"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-2.5 text-base font-medium"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              <Bot size={18} />
              Парсер рецептов
            </Link>
          )}

          {/* Парсер заведений в мобильном меню */}
          {isEditor && (
            <Link
              to="/tools/parse-place"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-2.5 text-base font-medium"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              <Bot size={18} />
              Парсер заведений
            </Link>
          )}

          {/* Админка в мобильном меню — для admin полностью, для editor только Рецепты/Места */}
          {isEditor && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-2.5 text-base font-medium"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              <Shield size={18} />
              Админ-панель
              {!!pendingCount?.total && (
                <span
                  className="flex items-center justify-center rounded-full text-white font-bold"
                  style={{ background: "#dc2626", fontSize: "11px", minWidth: "18px", height: "18px", padding: "0 4px", lineHeight: 1 }}
                >
                  {pendingCount.total > 99 ? "99+" : pendingCount.total}
                </span>
              )}
            </Link>
          )}

          <div style={{ borderBottom: "1px solid var(--border)", margin: "4px 0" }} />
          <Link
            to="/feedback"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 py-2.5 text-base font-medium"
            style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            <MessageCircle size={18} />
            Обратная связь
          </Link>
          <button
            onClick={() => { setMobileOpen(false); setDonateOpen(true); }}
            className="flex items-center gap-2 py-2.5 text-base font-medium w-full text-left"
            style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            <Heart size={18} />
            Поддержать
          </button>
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

    {donateOpen && <DonateModal onClose={() => setDonateOpen(false)} />}
    </>
  );
}
