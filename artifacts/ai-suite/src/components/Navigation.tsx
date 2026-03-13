import { useLocation } from "wouter";

const NAV_LINKS = [
  { path: "/", label: "Студия" },
  { path: "/generate", label: "Создать" },
  { path: "/gallery", label: "Галерея" },
  { path: "/pricing", label: "Тарифы" },
];

const MOBILE_NAV = [
  { path: "/", label: "Студия", icon: "✦" },
  { path: "/generate", label: "Создать", icon: "✨" },
  { path: "/gallery", label: "Галерея", icon: "🎨" },
  { path: "/pricing", label: "Тарифы", icon: "💎" },
];

function KamodLogo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{
          background: "linear-gradient(135deg, #C8A96E 0%, #8B6FE8 100%)",
          color: "#111118",
        }}
      >
        K
      </div>
      <span className="font-semibold text-base" style={{ color: "var(--k-text)" }}>
        Kamod <span style={{ color: "var(--k-muted)", fontWeight: 400 }}>AI</span>
      </span>
    </button>
  );
}

export function TopNav() {
  const [location, navigate] = useLocation();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 hidden md:block"
      style={{
        background: "rgba(17, 17, 24, 0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <KamodLogo onClick={() => navigate("/")} />

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ path, label }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? "var(--k-accent)" : "var(--k-muted)",
                  background: active ? "rgba(200, 169, 110, 0.08)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--k-text)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--k-muted)";
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            className="ml-1 text-sm"
            style={{ color: "var(--k-muted)" }}
          >
            Для бизнеса
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: "rgba(200, 169, 110, 0.1)",
              border: "1px solid rgba(200, 169, 110, 0.25)",
              color: "var(--k-accent)",
            }}
          >
            <span>💎</span>
            <span>550 кредитов</span>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="k-btn-accent px-4 py-1.5 text-sm"
          >
            Войти
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "rgba(17, 17, 24, 0.95)",
        backdropFilter: "blur(20px)",
        borderTop: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {MOBILE_NAV.map(({ path, label, icon }) => {
          const active = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: active ? "var(--k-accent)" : "var(--k-muted)" }}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function StatusBar() {
  return (
    <div
      className="status-bar px-4 py-2 flex items-center justify-between text-xs"
      style={{ color: "var(--k-muted)" }}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" style={{ background: "var(--k-green)" }} />
        <span>Все системы работают · 20 моделей активны</span>
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <span style={{ color: "var(--k-muted)" }}>Click · Payme · Humo · Uzcard</span>
      </div>
    </div>
  );
}
