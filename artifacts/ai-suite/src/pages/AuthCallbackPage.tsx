import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) { setErrMsg(error.message); return; }

        if (data.session) {
          const user = data.session.user;
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name ?? null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
              credits: 10,
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
          navigate("/");
        } else {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessErr) { setErrMsg(sessErr.message); return; }
          }
          navigate("/");
        }
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : "Ошибка входа");
      }
    };

    handleCallback();
  }, []);

  if (errMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--k-bg)" }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">Ошибка: {errMsg}</p>
          <button onClick={() => navigate("/auth")} className="k-btn-accent px-4 py-2 text-sm">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--k-bg)" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--k-accent)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--k-muted)" }}>Вход в систему...</p>
      </div>
    </div>
  );
}
