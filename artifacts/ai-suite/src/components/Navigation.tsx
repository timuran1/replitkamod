import { useLocation } from "wouter";

const NAV_ITEMS = [
  { path: "/", label: "Explore", icon: "✦" },
  { path: "/generate", label: "Generate", icon: "✨" },
  { path: "/gallery", label: "Gallery", icon: "🎨" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border md:hidden">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
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

export function TopNav() {
  const [location, navigate] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 hidden md:block bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-bold text-lg"
        >
          <span className="text-2xl">⚡</span>
          <span className="gradient-text">AI Suite</span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ path, label, icon }) => {
            const active = location === path || (path !== "/" && location.startsWith(path));
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
