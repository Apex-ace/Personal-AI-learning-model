import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  Edit3,
  Save,
  Trophy,
  Zap,
  Medal,
  Lock
} from "lucide-react";

/* ------------------ Progress Ring ------------------ */
function ProgressRing({ progress, color }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="60" height="60">
      <circle
        cx="30"
        cy="30"
        r={radius}
        stroke="#e5e7eb"
        strokeWidth="6"
        fill="none"
      />
      <circle
        cx="30"
        cy="30"
        r={radius}
        stroke={color}
        strokeWidth="6"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        fontSize="11"
        fontWeight="700"
        fill="#334155"
      >
        {Math.floor(progress)}%
      </text>
    </svg>
  );
}

/* ------------------ Profile ------------------ */
export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    grade: "",
    school: "",
    dream_job: "",
    favorite_subject: ""
  });

  const [stats, setStats] = useState({
    totalTests: 0,
    bestScore: 0,
    level: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profileData } = await supabase
        .from("student_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) setProfile(profileData);

      const { data: progress } = await supabase
        .from("student_progress")
        .select("total_predicted_marks")
        .eq("user_id", user.id);

      if (progress) {
        const scores = progress.map(p => p.total_predicted_marks || 0);
        setStats({
          totalTests: progress.length,
          bestScore: scores.length ? Math.max(...scores) : 0,
          level: Math.floor(progress.length / 2) + 1
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

  /* ------------------ 20 BADGES ------------------ */
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
    return (
      <div style={{ textAlign: "center", paddingTop: "80px" }}>
        <h2>Loading Profile…</h2>
      </div>
    );

  return (
    <div className="page-container">
      <div className="card" style={{ padding: "25px", textAlign: "center" }}>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          style={{
            float: "right",
            padding: "6px 14px",
            borderRadius: "20px",
            border: "none",
            background: "#6366f1",
            color: "white",
            cursor: "pointer"
          }}
        >
          {editing ? <Save size={14} /> : <Edit3 size={14} />}
        </button>

        {editing ? (
          <>
            <input name="name" value={profile.name} onChange={handleChange} />
            <input name="grade" value={profile.grade} onChange={handleChange} />
            <input name="school" value={profile.school} onChange={handleChange} />
          </>
        ) : (
          <>
            <h1>{profile.name || "Student"}</h1>
            <p>{profile.school || "No School"}</p>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px" }}>
          <div><Zap color="#eab308" /><div>{stats.level}</div></div>
          <div><Trophy color="#3b82f6" /><div>{stats.totalTests}</div></div>
          <div><Medal color="#ec4899" /><div>{stats.bestScore}</div></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "25px" }}>
        <h3>Badge Vault</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
            gap: "20px",
            marginTop: "15px"
          }}
        >
          {badgeList.map((b, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                height: "170px",
                borderRadius: "22px",
                background: b.unlocked
                  ? `linear-gradient(135deg, ${b.color}55, white)`
                  : "#f1f5f9",
                filter: b.unlocked ? "none" : "blur(1.4px)",
                transform: b.unlocked ? "scale(1)" : "scale(0.95)",
                transition: "all 0.4s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {!b.unlocked && (
                <Lock size={20} style={{ position: "absolute", top: 12, right: 12 }} />
              )}

              <div style={{ fontSize: "2.6rem" }}>{b.icon}</div>
              <strong style={{ fontSize: "0.75rem", marginTop: "6px" }}>{b.label}</strong>

              <div style={{ marginTop: "10px" }}>
                <ProgressRing progress={b.progress} color={b.color} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
