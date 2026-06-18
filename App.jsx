import { useState } from "react";

const DOG_THEMES = [
  { id: "walk", emoji: "🐾", label: "散歩" },
  { id: "daily", emoji: "🏠", label: "日常" },
  { id: "treat", emoji: "🦴", label: "ごほうび・おやつ" },
  { id: "memory", emoji: "📸", label: "思い出" },
  { id: "kindliving", emoji: "🌿", label: "犬に優しい暮らし" },
  { id: "owners", emoji: "😅", label: "飼い主あるある" },
];

const TONES = ["ほっこり", "おしゃれ", "ユーモア", "しみじみ", "元気いっぱい"];
const PERSPECTIVES = ["飼い主目線", "愛犬目線"];

const DOG_HASHTAG_BASE = [
  "犬のいる暮らし", "いぬすたぐらむ", "愛犬", "犬好きな人と繋がりたい",
  "犬のいる生活", "わんこ", "犬バカ部", "dog", "dogsofinstagram", "instadog"
];

const THEME_HASHTAGS = {
  walk: ["犬の散歩", "お散歩タイム", "散歩日和", "dogwalk", "朝散歩"],
  daily: ["犬との日常", "日常のワンシーン", "犬のいる毎日", "犬日記"],
  treat: ["犬のおやつ", "ごほうびタイム", "犬用おやつ", "おやつタイム", "dogtreat"],
  memory: ["犬との思い出", "大切な時間", "一生の宝物", "犬と過ごす時間"],
  kindliving: ["犬に優しい暮らし", "ペットと暮らす", "犬と共に生きる", "自然派ごはん"],
  owners: ["飼い主あるある", "犬飼いあるある", "犬飼いの日常", "あるある"],
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getCalDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < first; i++) days.push(null);
  for (let d = 1; d <= last; d++) days.push(d);
  return days;
}

const TABS = [
  { id: "generate", emoji: "✍️", label: "投稿生成" },
  { id: "schedule", emoji: "📅", label: "スケジュール" },
];

export default function DogInstaApp() {
  const [tab, setTab] = useState("generate");

  // Generate
  const [theme, setTheme] = useState("walk");
  const [freeInput, setFreeInput] = useState("");
  const [tone, setTone] = useState("ほっこり");
  const [perspective, setPerspective] = useState("飼い主目線");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Schedule
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [schedule, setSchedule] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [schedInput, setSchedInput] = useState("");
  const calDays = getCalDays(calYear, calMonth);

  async function generate() {
    setLoading(true);
    setCaption("");
    setHashtags([]);
    const themeLabel = DOG_THEMES.find(t => t.id === theme)?.label || theme;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "あなたは犬をテーマにしたInstagramアカウントの投稿専門家です。温かみがあり共感を呼ぶ文章を作ります。JSONのみ返してください。",
          messages: [{
            role: "user",
            content: `犬テーマのInstagram投稿文を作ってください。

テーマ: ${themeLabel}
補足・具体的なエピソード: ${freeInput || "なし"}
トーン: ${tone}
視点: ${perspective}

条件:
- キャプションは150〜200文字程度
- 絵文字を自然に使う
- 改行でリズムをつける
- 最後に読者への問いかけや共感を促す一言を入れる
- ハッシュタグは15〜20個（犬系に特化）

以下のJSONのみ返してください:
{"caption": "投稿文", "hashtags": ["タグ1", "タグ2", ...]}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content.map(i => i.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setCaption(parsed.caption);
      // Merge with base + theme hashtags, deduplicate
      const themeExtra = THEME_HASHTAGS[theme] || [];
      const all = [...new Set([...parsed.hashtags, ...DOG_HASHTAG_BASE, ...themeExtra])].slice(0, 20);
      setHashtags(all);
    } catch {
      setCaption("エラーが発生しました。もう一度お試しください。");
    }
    setLoading(false);
  }

  function copyAll() {
    const text = caption + "\n\n" + hashtags.map(h => "#" + h).join(" ");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedKey = selectedDay ? `${calYear}-${calMonth}-${selectedDay}` : null;
  const selectedPosts = selectedKey ? (schedule[selectedKey] || []) : [];
  const monthCount = Object.entries(schedule)
    .filter(([k]) => k.startsWith(`${calYear}-${calMonth}-`))
    .reduce((s, [, v]) => s + v.length, 0);

  function addSched() {
    if (!selectedDay || !schedInput.trim()) return;
    const key = `${calYear}-${calMonth}-${selectedDay}`;
    setSchedule(prev => ({ ...prev, [key]: [...(prev[key] || []), schedInput.trim()] }));
    setSchedInput("");
  }
  function removeSched(key, i) {
    setSchedule(prev => {
      const arr = [...(prev[key] || [])]; arr.splice(i, 1);
      return { ...prev, [key]: arr };
    });
  }

  function autoFillEvery2Days() {
    const last = new Date(calYear, calMonth + 1, 0).getDate();
    const newSched = { ...schedule };
    for (let d = 1; d <= last; d += 2) {
      const key = `${calYear}-${calMonth}-${d}`;
      if (!newSched[key] || newSched[key].length === 0) {
        newSched[key] = ["投稿予定 🐾"];
      }
    }
    setSchedule(newSched);
  }

  function clearMonthSchedule() {
    const newSched = { ...schedule };
    Object.keys(newSched).forEach(k => {
      if (k.startsWith(`${calYear}-${calMonth}-`)) delete newSched[k];
    });
    setSchedule(newSched);
    setSelectedDay(null);
  }

  const accentBrown = "#6b3f1f";
  const softBg = "#fdf6ef";
  const cardBg = "#fff";

  return (
    <div style={{ minHeight: "100vh", background: softBg, fontFamily: "'Hiragino Sans','Yu Gothic UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: accentBrown, padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 28 }}>🐶</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: 0.5 }}>犬と暮らすInstagram</div>
            <div style={{ color: "#c9956a", fontSize: 11 }}>投稿アシスタント · 犬特化</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? softBg : "transparent",
              color: tab === t.id ? accentBrown : "#c9956a",
              border: "none", borderRadius: "8px 8px 0 0",
              padding: "7px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}>{t.emoji} {t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* === 投稿生成 === */}
        {tab === "generate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Theme picker */}
            <div style={{ background: cardBg, borderRadius: 18, padding: "18px 18px 14px", boxShadow: "0 1px 10px #6b3f1f11" }}>
              <div style={{ fontWeight: 700, color: accentBrown, fontSize: 12, marginBottom: 10 }}>テーマを選ぶ</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {DOG_THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t.id)} style={{
                    background: theme === t.id ? accentBrown : "#faf3ec",
                    color: theme === t.id ? "#fff" : accentBrown,
                    border: theme === t.id ? "none" : "1.5px solid #e8d5c4",
                    borderRadius: 12, padding: "10px 14px",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                    transition: "all .15s"
                  }}>
                    <span style={{ fontSize: 18 }}>{t.emoji}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free input */}
            <div style={{ background: cardBg, borderRadius: 18, padding: "16px 18px", boxShadow: "0 1px 10px #6b3f1f11" }}>
              <div style={{ fontWeight: 700, color: accentBrown, fontSize: 12, marginBottom: 8 }}>エピソード・補足（任意）</div>
              <textarea value={freeInput} onChange={e => setFreeInput(e.target.value)}
                placeholder="例：雨上がりの公園で水たまりに飛び込んで全身びしょ濡れになった"
                rows={3} style={{
                  width: "100%", borderRadius: 10, border: "1.5px solid #e8d5c4",
                  padding: "10px 12px", fontSize: 14, resize: "none", outline: "none",
                  fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.7,
                  background: "#fdf8f4"
                }}
                onFocus={e => e.target.style.borderColor = accentBrown}
                onBlur={e => e.target.style.borderColor = "#e8d5c4"} />
            </div>

            {/* Tone + Perspective */}
            <div style={{ background: cardBg, borderRadius: 18, padding: "16px 18px", boxShadow: "0 1px 10px #6b3f1f11" }}>
              <div style={{ fontWeight: 700, color: accentBrown, fontSize: 12, marginBottom: 8 }}>トーン</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)} style={{
                    background: tone === t ? accentBrown : "#faf3ec",
                    color: tone === t ? "#fff" : accentBrown,
                    border: tone === t ? "none" : "1.5px solid #e8d5c4",
                    borderRadius: 20, padding: "6px 16px", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", transition: "all .15s"
                  }}>{t}</button>
                ))}
              </div>
              <div style={{ fontWeight: 700, color: accentBrown, fontSize: 12, margin: "14px 0 8px" }}>視点</div>
              <div style={{ display: "flex", gap: 8 }}>
                {PERSPECTIVES.map(p => (
                  <button key={p} onClick={() => setPerspective(p)} style={{
                    flex: 1, background: perspective === p ? accentBrown : "#faf3ec",
                    color: perspective === p ? "#fff" : accentBrown,
                    border: perspective === p ? "none" : "1.5px solid #e8d5c4",
                    borderRadius: 12, padding: "9px", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", transition: "all .15s"
                  }}>{p === "飼い主目線" ? "👤 飼い主目線" : "🐾 愛犬目線"}</button>
                ))}
              </div>
            </div>

            <button onClick={generate} disabled={loading} style={{
              background: loading ? "#ccc" : accentBrown,
              color: "#fff", border: "none", borderRadius: 14,
              padding: "14px", fontWeight: 800, fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 16px #6b3f1f33"
            }}>{loading ? "生成中...🐾" : "✨ 投稿を生成する"}</button>

            {caption && (
              <div style={{ background: cardBg, borderRadius: 18, padding: "18px 18px 14px", boxShadow: "0 1px 10px #6b3f1f11" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: accentBrown, fontSize: 12 }}>📝 キャプション</div>
                  <button onClick={copyAll} style={{
                    background: copied ? "#5a9e6f" : accentBrown,
                    color: "#fff", border: "none", borderRadius: 8,
                    padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                  }}>{copied ? "✓ コピー済" : "全部コピー"}</button>
                </div>
                <div style={{
                  whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.85, color: "#333",
                  background: "#fdf8f4", borderRadius: 12, padding: "12px 14px"
                }}>{caption}</div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, color: accentBrown, fontSize: 12, marginBottom: 8 }}># ハッシュタグ（{hashtags.length}個）</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {hashtags.map((h, i) => (
                      <span key={i} style={{
                        background: "#faf0e8", color: accentBrown,
                        borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                        border: "1px solid #e8d5c4"
                      }}>#{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === スケジュール === */}
        {tab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "今月の予定", value: monthCount, unit: "投稿" },
                { label: "予定日数", value: Object.keys(schedule).filter(k => k.startsWith(`${calYear}-${calMonth}-`)).length, unit: "日" }
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: cardBg, borderRadius: 16, padding: "16px", textAlign: "center", boxShadow: "0 1px 10px #6b3f1f11" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: accentBrown }}>{s.value}<span style={{ fontSize: 13, fontWeight: 600 }}>{s.unit}</span></div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Auto-fill buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={autoFillEvery2Days} style={{
                flex: 1, background: accentBrown, color: "#fff", border: "none",
                borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14,
                cursor: "pointer", boxShadow: "0 4px 12px #6b3f1f33"
              }}>🐾 2日おきに自動入力</button>
              <button onClick={clearMonthSchedule} style={{
                background: "#faf3ec", color: accentBrown, border: "1.5px solid #e8d5c4",
                borderRadius: 12, padding: "12px 16px", fontWeight: 700, fontSize: 13,
                cursor: "pointer"
              }}>クリア</button>
            </div>

            <div style={{ background: cardBg, borderRadius: 18, padding: "18px", boxShadow: "0 1px 10px #6b3f1f11" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <button onClick={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); setSelectedDay(null); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: accentBrown }}>‹</button>
                <span style={{ fontWeight: 800, fontSize: 15, color: accentBrown }}>{calYear}年 {calMonth + 1}月</span>
                <button onClick={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); setSelectedDay(null); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: accentBrown }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                {DAYS.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? "#e53935" : i === 6 ? "#1565c0" : "#bbb" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                {calDays.map((d, i) => {
                  const key = d ? `${calYear}-${calMonth}-${d}` : null;
                  const hasPosts = key && schedule[key]?.length > 0;
                  const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                  const isSelected = d === selectedDay;
                  return (
                    <button key={i} onClick={() => d && setSelectedDay(d)} style={{
                      aspectRatio: "1", borderRadius: 10,
                      border: isSelected ? `2px solid ${accentBrown}` : "2px solid transparent",
                      background: isSelected ? accentBrown : isToday ? "#faf0e8" : "#fafafa",
                      cursor: d ? "pointer" : "default",
                      fontWeight: isToday || isSelected ? 800 : 400, fontSize: 13,
                      color: !d ? "transparent" : isSelected ? "#fff" : (i % 7 === 0 ? "#e53935" : i % 7 === 6 ? "#1565c0" : "#333"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexDirection: "column", padding: 0, gap: 1
                    }}>
                      {d}
                      {hasPosts && <span style={{ fontSize: 8, lineHeight: 1 }}>{isSelected ? "🤍" : "🐾"}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDay && (
              <div style={{ background: cardBg, borderRadius: 18, padding: "18px", boxShadow: "0 1px 10px #6b3f1f11" }}>
                <div style={{ fontWeight: 700, color: accentBrown, fontSize: 13, marginBottom: 10 }}>
                  🐾 {calMonth + 1}月{selectedDay}日の投稿予定
                </div>
                {selectedPosts.length === 0 && <div style={{ color: "#ccc", fontSize: 13, marginBottom: 10 }}>まだ登録されていません</div>}
                {selectedPosts.map((p, i) => (
                  <div key={i} style={{
                    background: "#fdf8f4", borderRadius: 10, padding: "10px 12px",
                    display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8,
                    border: "1px solid #e8d5c4"
                  }}>
                    <span style={{ fontSize: 13, flex: 1, lineHeight: 1.6, color: "#333" }}>{p}</span>
                    <button onClick={() => removeSched(selectedKey, i)} style={{ background: "none", border: "none", color: "#ccc", fontWeight: 800, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input value={schedInput} onChange={e => setSchedInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSched()}
                    placeholder="例：散歩中のあくびショット"
                    style={{ flex: 1, borderRadius: 10, border: "1.5px solid #e8d5c4", padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fdf8f4" }}
                    onFocus={e => e.target.style.borderColor = accentBrown}
                    onBlur={e => e.target.style.borderColor = "#e8d5c4"} />
                  <button onClick={addSched} style={{ background: accentBrown, color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>追加</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
