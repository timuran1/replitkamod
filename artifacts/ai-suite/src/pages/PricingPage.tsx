import { useState } from "react";
import { useLocation } from "wouter";
import { PLANS, CALCULATOR_ROWS } from "@/lib/pricing";

const PAYMENT_ICONS = ["Click", "Payme", "Humo", "Uzcard"];

function PlanCard({ plan, index }: { plan: typeof PLANS[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col rounded-xl p-6 transition-all duration-200"
      style={{
        background: "var(--k-card)",
        border: plan.highlight
          ? "1.5px solid var(--k-accent)"
          : hovered
          ? "0.5px solid rgba(200, 169, 110, 0.3)"
          : "0.5px solid var(--k-border)",
        borderRadius: "12px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badge */}
      {plan.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full font-semibold"
          style={{ background: "var(--k-accent)", color: "#111118" }}
        >
          {plan.badge}
        </div>
      )}

      {/* Plan name */}
      <div className="mb-4">
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: plan.highlight ? "var(--k-accent)" : "var(--k-muted)" }}
        >
          {plan.name}
        </span>
      </div>

      {/* Price */}
      <div className="mb-2">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold" style={{ color: "var(--k-text)" }}>
            {plan.priceUZS === 0 ? "0" : plan.priceUZS.toLocaleString("ru-RU")}
          </span>
          <span className="text-sm mb-1.5" style={{ color: "var(--k-muted)" }}>UZS/мес</span>
        </div>
        <span className="text-xs" style={{ color: "var(--k-muted)" }}>{plan.priceUSD} в месяц</span>
      </div>

      {/* Credits */}
      <div
        className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg mb-5"
        style={{ background: "rgba(200, 169, 110, 0.07)", color: "var(--k-accent)" }}
      >
        <span>💎</span>
        <span>{plan.creditsLabel}</span>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--k-muted)" }}>
            <span style={{ color: "var(--k-green)", marginTop: "1px" }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all"
        style={
          plan.ctaVariant === "accent"
            ? { background: "var(--k-accent)", color: "#111118" }
            : {
                background: "transparent",
                color: "var(--k-accent)",
                border: "1px solid rgba(200, 169, 110, 0.35)",
              }
        }
      >
        {plan.cta}
      </button>
    </div>
  );
}

function CreditCalculator() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "0.5px solid var(--k-border)" }}
    >
      <div className="px-4 py-3" style={{ background: "var(--k-surface)", borderBottom: "0.5px solid var(--k-border)" }}>
        <h3 className="font-semibold text-sm" style={{ color: "var(--k-text)" }}>
          Сколько контента вы получите?
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "0.5px solid var(--k-border)" }}>
              {["Тариф", "Кредиты", "Изображения (NB Pro)", "Видео (Wan, 5с)", "Видео (Kling, 5с)", "Голос (TTS)"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--k-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CALCULATOR_ROWS.map((row, i) => (
              <tr
                key={row.plan}
                style={{
                  borderBottom: i < CALCULATOR_ROWS.length - 1 ? "0.5px solid var(--k-border)" : "none",
                  background: row.plan === "Creator" ? "rgba(200, 169, 110, 0.04)" : "transparent",
                }}
              >
                <td className="px-4 py-3 font-semibold text-xs" style={{ color: row.plan === "Creator" ? "var(--k-accent)" : "var(--k-text)" }}>
                  {row.plan}
                  {row.plan === "Creator" && <span className="ml-1 text-xs">⭐</span>}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--k-accent)" }}>{row.credits}</td>
                <td className="px-4 py-3" style={{ color: "var(--k-text)" }}>{row.images}</td>
                <td className="px-4 py-3" style={{ color: "var(--k-text)" }}>{row.wanVideos}</td>
                <td className="px-4 py-3" style={{ color: "var(--k-text)" }}>{row.klingVideos}</td>
                <td className="px-4 py-3" style={{ color: "var(--k-text)" }}>{row.tts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "var(--k-bg)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="text-sm mb-8 flex items-center gap-1.5 transition-colors"
          style={{ color: "var(--k-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--k-text)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--k-muted)")}
        >
          ← Назад
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full mb-4"
            style={{ background: "rgba(200, 169, 110, 0.08)", border: "0.5px solid rgba(200, 169, 110, 0.25)", color: "var(--k-accent)" }}
          >
            <span>💎</span>
            <span>Прозрачные тарифы · Оплата в UZS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "var(--k-text)" }}>
            Выберите тариф
          </h1>
          <p className="text-base" style={{ color: "var(--k-muted)" }}>
            Начните бесплатно. Оплата через Click, Payme, Humo, Uzcard.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>

        {/* Payment icons */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {PAYMENT_ICONS.map((name) => (
              <div
                key={name}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)", color: "var(--k-text)" }}
              >
                {name}
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--k-muted)" }}>
            Безопасная оплата · Отмена в любое время
          </p>
        </div>

        {/* Credit Calculator */}
        <div className="mb-12">
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--k-text)" }}>
            Калькулятор кредитов
          </h2>
          <CreditCalculator />
        </div>

        {/* FAQ / note */}
        <div
          className="rounded-xl p-6 text-sm text-center"
          style={{ background: "var(--k-surface)", border: "0.5px solid var(--k-border)", color: "var(--k-muted)" }}
        >
          <p>Кредиты не сгорают в течение 30 дней. 1 кредит = 363 UZS по тарифу Creator.</p>
          <p className="mt-1">Неиспользованные кредиты накапливаются до следующего расчётного периода.</p>
        </div>
      </div>
    </div>
  );
}
