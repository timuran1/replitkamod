import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--k-bg)" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(200,169,110,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 mb-10"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold"
            style={{
              background: "linear-gradient(135deg, #C8A96E 0%, #8B6FE8 100%)",
              color: "#111118",
            }}
          >
            K
          </div>
          <span className="text-xl font-semibold" style={{ color: "var(--k-text)" }}>
            Kamod <span style={{ color: "var(--k-muted)", fontWeight: 400 }}>AI</span>
          </span>
        </button>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col items-center"
          style={{
            background: "var(--k-card)",
            border: "0.5px solid var(--k-border)",
          }}
        >
          <h1 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--k-text)" }}>
            Добро пожаловать
          </h1>
          <p className="text-sm text-center mb-8" style={{ color: "var(--k-muted)" }}>
            Войдите, чтобы создавать изображения и видео с помощью ИИ
          </p>

          {/* Google sign-in button */}
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
              background: "#fff",
              color: "#1a1a1a",
              border: "none",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Войти через Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full my-5">
            <div className="flex-1 h-px" style={{ background: "var(--k-border)" }} />
            <span className="text-xs" style={{ color: "var(--k-muted)" }}>или</span>
            <div className="flex-1 h-px" style={{ background: "var(--k-border)" }} />
          </div>

          {/* Placeholder for email — future */}
          <p className="text-xs text-center" style={{ color: "var(--k-muted)" }}>
            Вход по email появится скоро.
          </p>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center mt-6" style={{ color: "var(--k-muted)" }}>
          Нажимая «Войти», вы принимаете условия использования.
          <br />
          При регистрации вы получите <span style={{ color: "var(--k-accent)" }}>10 бесплатных кредитов</span>.
        </p>
      </div>
    </div>
  );
}
