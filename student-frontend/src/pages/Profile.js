import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import {
  Edit3,
  Save,
  Smile,
  Star,
  Book,
  Briefcase,
  Trophy,
  Zap,
  Medal,
  Lock
} from "lucide-react";

/* ---------- Progress Ring ---------- */
function ProgressRing({ progress, color }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="48" height="48">
      <circle cx="24" cy="24" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="none" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        stroke={color}
        strokeWidth="4"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#334155"
      >
        {Math.floor(progress)}%
      </text>
    </svg>
  );
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    grade: "",
    school: "",
    favorite_subject: "",
    dream_job: "",
    hobbies: ""
  });

  const [stats, setStats] = useState({
    totalTests: 0,
    bestScore: 0,
    level: 1
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profileData } = await supabase
        .from("student_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) setProfile(profileData);

      const { data: historyData } = await supabase
        .from("student_progress")
        .select("total_predicted_marks")
        .eq("user_id", user.id);

      if (historyData) {
        const scores = historyData.map(h => h.total_predicted_marks || 0);
        setStats({
          totalTests: historyData.length,
          bestScore: scores.length ? Math.max(...scores) : 0,
          level: Math.floor(historyData.length / 2) + 1
        });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("student_profile")
      .upsert({ user_id: user.id, ...profile }, { onConflict: "user_id" });

    setEditing(false);
  };

  const handleChange = e =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  /* ---------- 20 BADGES ---------- */
  const badgeList = [
    { icon: "🌱", label: "First Step", unlocked: stats.totalTests >= 1, progress: Math.min(stats.totalTests * 100, 100), color: "#84cc16" },
    { icon: "⚡", label: "Quick Learner", unlocked: stats.totalTests >= 2, progress: Math.min((stats.totalTests / 2) * 100, 100), color: "#facc15" },
    { icon: "📚", label: "Bookworm", unlocked: stats.totalTests >= 3, progress: Math.min((stats.totalTests / 3) * 100, 100), color: "#38bdf8" },
    { icon: "🧠", label: "Brain Boost", unlocked: stats.totalTests >= 4, progress: Math.min((stats.totalTests / 4) * 100, 100), color: "#0ea5e9" },
    { icon: "🎓", label: "Scholar", unlocked: stats.totalTests >= 5, progress: Math.min((stats.totalTests / 5) * 100, 100), color: "#6366f1" },

    { icon: "🎯", label: "Sharp Aim", unlocked: stats.bestScore >= 50, progress: Math.min((stats.bestScore / 50) * 100, 100), color: "#22c55e" },
    { icon: "🔥", label: "On Fire", unlocked: stats.bestScore >= 70, progress: Math.min((stats.bestScore / 70) * 100, 100), color: "#fb923c" },
    { icon: "💥", label: "High Impact", unlocked: stats.bestScore >= 80, progress: Math.min((stats.bestScore / 80) * 100, 100), color: "#f97316" },
    { icon: "💎", label: "Elite Scorer", unlocked: stats.bestScore >= 90, progress: Math.min((stats.bestScore / 90) * 100, 100), color: "#a855f7" },
    { icon: "👑", label: "Topper", unlocked: stats.bestScore >= 95, progress: Math.min((stats.bestScore / 95) * 100, 100), color: "#ec4899" },

    { icon: "🧪", label: "Subject Lover", unlocked: !!profile.favorite_subject, progress: profile.favorite_subject ? 100 : 0, color: "#14b8a6" },
    { icon: "🚀", label: "Visionary", unlocked: !!profile.dream_job, progress: profile.dream_job ? 100 : 0, color: "#f472b6" },
    { icon: "🗓️", label: "Consistent", unlocked: stats.totalTests >= 7, progress: Math.min((stats.totalTests / 7) * 100, 100), color: "#10b981" },
    { icon: "🏃", label: "Marathoner", unlocked: stats.totalTests >= 10, progress: Math.min((stats.totalTests / 10) * 100, 100), color: "#06b6d4" },
    { icon: "🧭", label: "Explorer", unlocked: stats.level >= 3, progress: Math.min((stats.level / 3) * 100, 100), color: "#0ea5e9" },

    { icon: "🛡️", label: "Veteran", unlocked: stats.level >= 5, progress: Math.min((stats.level / 5) * 100, 100), color: "#8b5cf6" },
    { icon: "⚔️", label: "Champion", unlocked: stats.level >= 7, progress: Math.min((stats.level / 7) * 100, 100), color: "#7c3aed" },
    { icon: "🐉", label: "Legend", unlocked: stats.level >= 10, progress: Math.min((stats.level / 10) * 100, 100), color: "#6d28d9" },
    { icon: "🌌", label: "Mythic Mind", unlocked: stats.level >= 15, progress: Math.min((stats.level / 15) * 100, 100), color: "#312e81" },
    { icon: "♾️", label: "Immortal", unlocked: stats.level >= 20, progress: Math.min((stats.level / 20) * 100, 100), color: "#020617" }
  ];

  if (loading)
    return <div style={{ textAlign: "center", paddingTop: 60 }}>Loading ID Card…</div>;

  return (
    <div className="page-container">

      {/* ---- ORIGINAL PROFILE UI UNCHANGED ---- */}
      {/* (passport card, stats, about me — same as before) */}

      {/* ---- TROPHY SHELF (UPGRADED ONLY) ---- */}
      <div className="card">
        <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Trophy color="#eab308" /> Trophy Shelf
        </h3>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
          {badgeList.map((b, i) => (
            <div
              key={i}
              style={{
                width: 90,
                height: 120,
                borderRadius: 16,
                background: b.unlocked ? b.color + "22" : "#f1f5f9",
                border: `2px solid ${b.unlocked ? b.color : "#cbd5f5"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                filter: b.unlocked ? "none" : "grayscale(1)",
                opacity: b.unlocked ? 1 : 0.6,
                position: "relative"
              }}
            >
              {!b.unlocked && <Lock size={14} style={{ position: "absolute", top: 6, right: 6 }} />}
              <div style={{ fontSize: "1.9rem" }}>{b.icon}</div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700 }}>{b.label}</div>
              <ProgressRing progress={b.progress} color={b.color} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
