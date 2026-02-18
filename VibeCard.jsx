import { useState, useCallback, useRef } from "react";

const loadHtml2Canvas = (() => {
  let promise = null;
  return () => {
    if (!promise) {
      promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = () => resolve(window.html2canvas);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return promise;
  };
})();

/* ── Palette ── */
const C = {
  cardBg: "linear-gradient(160deg, #1c1917 0%, #292524 100%)",
  cardBorder: "rgba(214,198,172,0.13)",
  cardShadow: "0 6px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
  title: "#faf6f0",
  subtitle: "rgba(214,198,172,0.55)",
  dimLabel: "rgba(214,198,172,0.72)",
  human: "#6d8cc7",
  humanBright: "#8aa4d6",
  ai: "#d4836b",
  aiBright: "#e09880",
  accent: "#c9a96e",
  muted: "rgba(214,198,172,0.3)",
  bg: "#121110",
};

/* ── Dimensions ── */
const ALL_DIMENSIONS = [
  { id: "ideation", label: "Ideation", icon: "💡" },
  { id: "research", label: "Research & Analysis", icon: "🔬" },
  { id: "drafting", label: "Drafting", icon: "✍️" },
  { id: "code", label: "Code", icon: "⌨️" },
  { id: "editing", label: "Editing & Refinement", icon: "✂️" },
  { id: "review", label: "Final Review", icon: "👁️" },
];

/* ── Default preset (example + blank custom) ── */
const DEFAULT_PRESETS = {
  "example": {
    title: "Example: A Typical AI-Assisted Essay",
    author: "Author Name",
    model: "Model name + version",
    date: "2026",
    ai: { ideation: 15, research: 35, drafting: 75, code: 0, editing: 50, review: 20 },
    human: { ideation: 10, research: 30, drafting: 70, code: 0, editing: 45, review: 15 },
    enabledDimensions: ["ideation", "research", "drafting", "editing", "review"],
  },
  "custom": {
    title: "My Work Product",
    author: "Author",
    model: "Model name + version",
    date: "2026",
    ai: { ideation: 50, research: 50, drafting: 50, code: 50, editing: 50, review: 50 },
    human: { ideation: 50, research: 50, drafting: 50, code: 50, editing: 50, review: 50 },
    enabledDimensions: ["ideation", "research", "drafting", "code", "editing", "review"],
  },
};

/* ── Slider Track ── */
function SliderTrack({ aiValue, humanValue, dimId, onHumanChange, showBoth }) {
  const trackRef = useRef(null);
  const isDragging = useRef(false);

  const handleInteraction = useCallback((clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onHumanChange(dimId, Math.round(pct));
  }, [dimId, onHumanChange]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    handleInteraction(e.clientX);
    const onMove = (ev) => { if (isDragging.current) handleInteraction(ev.clientX); };
    const onUp = () => { isDragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleTouchStart = (e) => {
    isDragging.current = true;
    handleInteraction(e.touches[0].clientX);
    const onMove = (ev) => { if (isDragging.current) { ev.preventDefault(); handleInteraction(ev.touches[0].clientX); } };
    const onEnd = () => { isDragging.current = false; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  return (
    <div
      ref={trackRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "relative", height: 28,
        cursor: "pointer", touchAction: "none", userSelect: "none",
      }}
    >
      <div style={{
        position: "absolute", top: 10, left: 0, right: 0, height: 8,
        borderRadius: 4, background: C.ai, opacity: 0.28,
      }} />
      <div style={{
        position: "absolute", top: 10, left: 0,
        width: `${humanValue}%`, height: 8,
        borderRadius: humanValue >= 99 ? 4 : "4px 0 0 4px",
        background: `linear-gradient(90deg, ${C.human}, ${C.humanBright})`,
        opacity: 0.65,
        transition: isDragging.current ? "none" : "width 0.15s ease",
      }} />
      {showBoth && (
        <div style={{
          position: "absolute", top: 6, left: `${aiValue}%`,
          transform: "translateX(-50%)",
          width: 15, height: 15, borderRadius: "50%",
          background: C.ai, border: "2px solid rgba(28,25,23,0.8)",
          opacity: 0.5, transition: "left 0.3s ease",
          pointerEvents: "none", zIndex: 1,
        }}/>
      )}
      <div style={{
        position: "absolute", top: 3.5, left: `${humanValue}%`,
        transform: "translateX(-50%)",
        width: 21, height: 21, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${C.humanBright}, ${C.human})`,
        border: `2.5px solid ${C.title}`,
        boxShadow: "0 1px 8px rgba(109,140,199,0.35)",
        transition: isDragging.current ? "none" : "left 0.15s ease",
        zIndex: 2,
      }} />
    </div>
  );
}

/* ── Vibe Card ── */
function VibeCard({ preset, showBoth, onValuesChange, cardRef }) {
  const dims = ALL_DIMENSIONS.filter(d => preset.enabledDimensions.includes(d.id));
  return (
    <div ref={cardRef} style={{
      background: C.cardBg, borderRadius: 16,
      padding: "24px 28px 20px",
      border: `1px solid ${C.cardBorder}`,
      boxShadow: C.cardShadow,
      maxWidth: 480, width: "100%",
      fontFamily: "'Source Serif 4', 'Georgia', serif",
    }}>
      <div style={{ marginBottom: 18, borderBottom: `1px solid ${C.cardBorder}`, paddingBottom: 14 }}>
        <div style={{
          fontSize: 9, letterSpacing: 3, color: C.accent,
          textTransform: "uppercase", fontWeight: 700, marginBottom: 5,
          fontFamily: "'DM Sans', sans-serif",
        }}>Vibe Card</div>
        <div style={{ fontSize: 17, color: C.title, fontWeight: 600, lineHeight: 1.35 }}>
          {preset.title}
        </div>
        <div style={{
          fontSize: 11.5, color: C.subtitle, marginTop: 4,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {preset.author} · {preset.date} · {preset.model}
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between",
        marginBottom: 8, padding: "0 2px",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <span style={{ fontSize: 17, letterSpacing: 1, color: C.human, textTransform: "uppercase", fontWeight: 700 }}>Human</span>
        <span style={{ fontSize: 17, letterSpacing: 1, color: C.ai, textTransform: "uppercase", fontWeight: 700 }}>AI</span>
      </div>

      {dims.map(dim => {
        const humanPct = 100 - preset.human[dim.id];
        const aiPct = preset.human[dim.id];
        return (
          <div key={dim.id} style={{ marginBottom: 11 }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 2,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <span style={{ fontSize: 11, color: C.human, fontFamily: "monospace", fontWeight: 700, minWidth: 34, textAlign: "left" }}>{humanPct}%</span>
              <span style={{ fontSize: 12, color: C.dimLabel, fontWeight: 500, textAlign: "center", flex: 1, letterSpacing: 0.2 }}>{dim.icon} {dim.label}</span>
              <span style={{ fontSize: 11, color: C.ai, fontFamily: "monospace", fontWeight: 700, minWidth: 34, textAlign: "right" }}>{aiPct}%</span>
            </div>
            <SliderTrack aiValue={preset.ai[dim.id]} humanValue={preset.human[dim.id]} dimId={dim.id} onHumanChange={onValuesChange} showBoth={showBoth} />
          </div>
        );
      })}

      {showBoth && (
        <div style={{
          display: "flex", gap: 18, marginTop: 14, paddingTop: 12,
          borderTop: `1px solid ${C.cardBorder}`,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: C.human, border: `1.5px solid ${C.title}` }} />
            <span style={{ fontSize: 10.5, color: C.subtitle }}>Human assessment</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: C.ai, border: "1.5px solid rgba(28,25,23,0.6)", opacity: 0.6 }} />
            <span style={{ fontSize: 10.5, color: C.subtitle }}>AI proposed</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── App ── */
export default function App() {
  const [activePreset, setActivePreset] = useState("custom");
  const [showBoth, setShowBoth] = useState(true);
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef(null);

  const handleHumanChange = useCallback((dimId, value) => {
    setPresets(prev => ({
      ...prev,
      [activePreset]: {
        ...prev[activePreset],
        human: { ...prev[activePreset].human, [dimId]: value },
      }
    }));
  }, [activePreset]);

  const handleExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, scale: 3, useCORS: true, logging: false,
      });
      const link = document.createElement("a");
      const safeName = presets[activePreset].title
        .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
      link.download = `vibe_card_${safeName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [activePreset, presets, exporting]);

  const currentPreset = presets[activePreset];

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "36px 16px",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ textAlign: "center", marginBottom: 30, maxWidth: 520 }}>
        <h1 style={{
          fontSize: 30, fontWeight: 700, color: C.title,
          margin: "0 0 6px", letterSpacing: -0.5,
          fontFamily: "'Source Serif 4', Georgia, serif",
        }}>Vibe Card</h1>
        <p style={{ fontSize: 13, color: C.subtitle, margin: 0, lineHeight: 1.5 }}>
          A transparency standard for human–AI collaboration.
          <br />Drag the sliders to set your contribution levels.
        </p>
      </div>

      {/* Presets */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        justifyContent: "center", marginBottom: 24, maxWidth: 520,
      }}>
        {Object.entries(DEFAULT_PRESETS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => setActivePreset(key)}
            style={{
              padding: "5px 13px", borderRadius: 20,
              border: activePreset === key ? `1.5px solid ${C.accent}` : `1px solid ${C.cardBorder}`,
              background: activePreset === key ? "rgba(201,169,110,0.12)" : "rgba(214,198,172,0.04)",
              color: activePreset === key ? C.title : C.subtitle,
              fontSize: 11, fontWeight: activePreset === key ? 600 : 400,
              cursor: "pointer", transition: "all 0.2s ease", fontFamily: "inherit",
            }}
          >
            {key === "custom" ? "✏️ Custom" : key === "example" ? "📋 Example" : p.title}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: C.subtitle }}>Show AI's proposed values</span>
        <button
          onClick={() => setShowBoth(!showBoth)}
          style={{
            width: 36, height: 20, borderRadius: 10, border: "none",
            background: showBoth ? C.human : "rgba(214,198,172,0.15)",
            position: "relative", cursor: "pointer", transition: "background 0.2s ease",
          }}
        >
          <div style={{
            position: "absolute", top: 2, left: showBoth ? 18 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: C.title, transition: "left 0.2s ease",
          }} />
        </button>
      </div>

      <div style={{
        maxWidth: 480, width: "100%", marginBottom: 16,
        padding: "10px 14px",
        background: "rgba(109,140,199,0.06)",
        border: "1px solid rgba(109,140,199,0.15)",
        borderRadius: 8,
      }}>
        <p style={{ fontSize: 11.5, color: "rgba(214,198,172,0.6)", margin: 0, lineHeight: 1.6 }}>
          <span style={{ color: C.human, fontWeight: 600 }}>How to use:</span> Drag the
          sliders to set where each dimension falls between Human and AI. When you're happy,
          hit <strong style={{ color: C.title }}>Save as PNG</strong> below to download a
          transparent-background image you can embed at the top of your essay.
        </p>
      </div>

      <VibeCard preset={currentPreset} showBoth={showBoth} onValuesChange={handleHumanChange} cardRef={cardRef} />

      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          marginTop: 20, padding: "12px 32px", borderRadius: 10,
          border: `1.5px solid ${C.human}`,
          background: exporting ? "rgba(109,140,199,0.1)" : "rgba(109,140,199,0.15)",
          color: exporting ? "rgba(214,198,172,0.4)" : C.title,
          fontSize: 14, fontWeight: 600,
          cursor: exporting ? "wait" : "pointer",
          fontFamily: "inherit", letterSpacing: 0.3,
          transition: "all 0.2s ease", maxWidth: 480, width: "100%",
        }}
        onMouseEnter={(e) => { if (!exporting) { e.target.style.background = "rgba(109,140,199,0.25)"; }}}
        onMouseLeave={(e) => { if (!exporting) { e.target.style.background = "rgba(109,140,199,0.15)"; }}}
      >
        {exporting ? "Exporting…" : "💾 Save as PNG"}
      </button>

      <details style={{ marginTop: 28, maxWidth: 480, width: "100%", cursor: "pointer" }}>
        <summary style={{ fontSize: 11, color: C.muted, fontFamily: "inherit", listStyle: "none", textAlign: "center" }}>
          <span style={{ borderBottom: `1px dashed ${C.muted}`, paddingBottom: 1 }}>⚠️ Model verification prompt template</span>
        </summary>
        <div style={{
          marginTop: 12, background: "rgba(214,198,172,0.03)",
          border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: 16,
        }}>
          <p style={{ fontSize: 11, color: C.subtitle, margin: "0 0 10px", lineHeight: 1.6 }}>
            When asking an AI to generate a Vibe Card, include this in your prompt to force accurate model identification:
          </p>
          <pre style={{
            fontSize: 10.5, color: C.accent,
            background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 6,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            lineHeight: 1.6, margin: 0,
            fontFamily: "'DM Mono', 'Courier New', monospace",
          }}>{`Before filling in the model field on this Vibe Card:
1. State your exact model name and version string
   (e.g. "Claude Opus 4.6", "GPT-4o", "Gemini 2.0 Flash")
2. State today's date
3. Do NOT guess or round — if you are uncertain of
   your own version number, say so explicitly
4. The human will verify and correct if needed`}</pre>
        </div>
      </details>

      <p style={{ fontSize: 10, color: C.muted, marginTop: 16, textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
        <a href="https://github.com/KaseyMarkel/vibe-card" style={{ color: C.accent, textDecoration: "none" }}>GitHub</a> · MIT License · Adopt the standard for your own work.
      </p>
    </div>
  );
}
