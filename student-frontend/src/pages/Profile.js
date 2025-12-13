import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
    Edit3, Save, MapPin, Smile, Star, Book, Briefcase, 
    Trophy, Zap, Medal 
} from 'lucide-react';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  // Profile Data
  const [profile, setProfile] = useState({ 
    name: '', grade: '', school: '', favorite_subject: '', dream_job: '', hobbies: '' 
  });
  
  // Stats Data
  const [stats, setStats] = useState({ totalTests: 0, bestScore: 0, level: 1 });

  useEffect(() => { fetchProfileData(); }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Fetch Profile
        const { data: profileData } = await supabase
          .from('student_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profileData) setProfile(profileData);

        // Fetch History for Stats
        const { data: historyData } = await supabase
          .from('student_progress')
          .select('total_predicted_marks')
          .eq('user_id', user.id);
        
        if (historyData) {
            const scores = historyData.map(h => h.total_predicted_marks || 0);
            const best = scores.length > 0 ? Math.max(...scores) : 0;
            setStats({
                totalTests: historyData.length,
                bestScore: best,
                level: Math.floor(historyData.length / 2) + 1
            });
        }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { error } = await supabase
          .from('student_profile')
          .upsert({ user_id: user.id, ...profile }, { onConflict: 'user_id' });
        if (!error) { setEditing(false); }
    }
  };

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const getBadges = () => {
    let badges = [];
    if (stats.totalTests >= 1) badges.push({ icon: "🌱", label: "Novice", color: "#ecfccb", border: "#84cc16" });
    if (stats.totalTests >= 5) badges.push({ icon: "📚", label: "Scholar", color: "#e0f2fe", border: "#0ea5e9" });
    if (stats.bestScore >= 80) badges.push({ icon: "🔥", label: "On Fire", color: "#ffedd5", border: "#f97316" });
    if (stats.level >= 5) badges.push({ icon: "👑", label: "Veteran", color: "#f3e8ff", border: "#a855f7" });
    if (profile.dream_job) badges.push({ icon: "🚀", label: "Visionary", color: "#fce7f3", border: "#ec4899" });
    return badges;
  };

  if (loading) return <div className="page-container" style={{textAlign:'center', paddingTop:'50px'}}><h2>Loading ID Card... 💳</h2></div>;

  return (
    <div className="page-container">
      
      {/* --- TOP SECTION: PASSPORT CARD --- */}
      <div className="card" style={{padding: 0, overflow: 'hidden', border: 'none', position: 'relative'}}>
        
        {/* Colorful Banner */}
        <div style={{
            height: '140px', 
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
            position: 'relative'
        }}>
            <button 
                onClick={() => editing ? handleSave() : setEditing(true)}
                style={{
                    position: 'absolute', top: '15px', right: '15px',
                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                    color: 'white', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer',
                    backdropFilter: 'blur(5px)', display: 'flex', gap: '8px', alignItems: 'center'
                }}
            >
                {editing ? <Save size={16}/> : <Edit3 size={16}/>} {editing ? "Save" : "Edit"}
            </button>
        </div>

        {/* Avatar & Info */}
        <div style={{padding: '0 25px 25px', marginTop: '-50px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div style={{
                width: '100px', height: '100px', background: 'white', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
                border: '5px solid white', boxShadow: '0 5px 20px rgba(0,0,0,0.1)', zIndex: 2
            }}>
                {profile.name ? profile.name[0].toUpperCase() : "🦁"}
            </div>

            {editing ? (
                <div style={{width: '100%', maxWidth: '400px', marginTop: '15px', display:'grid', gap:'10px'}}>
                    <input name="name" value={profile.name} onChange={handleChange} placeholder="Your Name" style={{textAlign:'center', fontWeight:'bold'}}/>
                    <input name="grade" value={profile.grade} onChange={handleChange} placeholder="Grade (e.g. 5)" style={{textAlign:'center'}}/>
                    <input name="school" value={profile.school} onChange={handleChange} placeholder="School Name" style={{textAlign:'center'}}/>
                </div>
            ) : (
                <div style={{textAlign: 'center', marginTop: '10px'}}>
                    <h1 style={{margin: '5px 0', fontSize: '1.8rem'}}>{profile.name || "New Student"}</h1>
                    <div style={{color: '#64748b', display: 'flex', gap: '15px', justifyContent: 'center', fontSize: '0.9rem', marginBottom: '15px'}}>
                        <span>🎓 {profile.grade ? `${profile.grade}th Grade` : "Grade ?"}</span>
                        <span>🏫 {profile.school || "No School"}</span>
                    </div>
                </div>
            )}
            
            {/* Quick Stats Row */}
            <div style={{
                display: 'flex', gap: '15px', width: '100%', maxWidth: '500px', 
                justifyContent: 'space-between', marginTop: '10px', background: '#f8fafc',
                padding: '15px', borderRadius: '20px', border: '1px solid #e2e8f0'
            }}>
                <div style={{textAlign: 'center', flex: 1}}>
                    <Zap size={20} color="#eab308" style={{display:'block', margin:'0 auto 5px'}}/>
                    <strong style={{display:'block', fontSize:'1.2rem'}}>{stats.level}</strong>
                    <span style={{fontSize:'0.8rem', color:'#64748b'}}>Level</span>
                </div>
                <div style={{width: '1px', background: '#e2e8f0'}}></div>
                <div style={{textAlign: 'center', flex: 1}}>
                    <Trophy size={20} color="#3b82f6" style={{display:'block', margin:'0 auto 5px'}}/>
                    <strong style={{display:'block', fontSize:'1.2rem'}}>{stats.totalTests}</strong>
                    <span style={{fontSize:'0.8rem', color:'#64748b'}}>Missions</span>
                </div>
                <div style={{width: '1px', background: '#e2e8f0'}}></div>
                <div style={{textAlign: 'center', flex: 1}}>
                    <Medal size={20} color="#ec4899" style={{display:'block', margin:'0 auto 5px'}}/>
                    <strong style={{display:'block', fontSize:'1.2rem'}}>{stats.bestScore}</strong>
                    <span style={{fontSize:'0.8rem', color:'#64748b'}}>High Score</span>
                </div>
            </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: DETAILS & BADGES --- */}
      <div className="profile-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
        
        {/* ABOUT ME CARD */}
        <div className="card">
            <h3 style={{display:'flex', alignItems:'center', gap:'10px', marginTop:0, color:'#334155'}}>
                <Smile color="#3b82f6"/> About Me
            </h3>
            
            {editing ? (
                <div style={{display:'grid', gap:'10px'}}>
                    <div><label style={{fontSize:'0.8rem'}}>Dream Job</label><input name="dream_job" value={profile.dream_job} onChange={handleChange}/></div>
                    <div><label style={{fontSize:'0.8rem'}}>Fav Subject</label><input name="favorite_subject" value={profile.favorite_subject} onChange={handleChange}/></div>
                    <div><label style={{fontSize:'0.8rem'}}>Hobbies</label><input name="hobbies" value={profile.hobbies} onChange={handleChange}/></div>
                </div>
            ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    <div style={{background: '#f0f9ff', padding: '12px', borderRadius: '15px', borderLeft: '4px solid #3b82f6'}}>
                        <div style={{fontSize:'0.8rem', color:'#64748b', marginBottom:'2px'}}>Dream Job</div>
                        <div style={{fontWeight:'600', display:'flex', alignItems:'center', gap:'8px'}}>
                            <Briefcase size={16} color="#3b82f6"/> {profile.dream_job || "Thinking..."}
                        </div>
                    </div>
                    <div style={{background: '#fdf2f8', padding: '12px', borderRadius: '15px', borderLeft: '4px solid #ec4899'}}>
                        <div style={{fontSize:'0.8rem', color:'#64748b', marginBottom:'2px'}}>Fav Subject</div>
                        <div style={{fontWeight:'600', display:'flex', alignItems:'center', gap:'8px'}}>
                            <Book size={16} color="#ec4899"/> {profile.favorite_subject || "Recess"}
                        </div>
                    </div>
                    <div style={{background: '#fffbeb', padding: '12px', borderRadius: '15px', borderLeft: '4px solid #eab308'}}>
                        <div style={{fontSize:'0.8rem', color:'#64748b', marginBottom:'2px'}}>Hobbies</div>
                        <div style={{fontWeight:'600', display:'flex', alignItems:'center', gap:'8px'}}>
                            <Star size={16} color="#eab308"/> {profile.hobbies || "Exploring"}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* BADGE COLLECTION CARD */}
        <div className="card">
            <h3 style={{display:'flex', alignItems:'center', gap:'10px', marginTop:0, color:'#334155'}}>
                <Trophy color="#eab308"/> Trophy Shelf
            </h3>
            
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px'}}>
                {getBadges().length > 0 ? getBadges().map((b, i) => (
                    <div key={i} style={{
                        background: b.color, border: `2px solid ${b.border}`,
                        borderRadius: '15px', padding: '10px', width: '80px', height: '90px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                    }}>
                        <span style={{fontSize: '2rem', marginBottom: '5px'}}>{b.icon}</span>
                        <span style={{fontSize: '0.7rem', fontWeight: 'bold', color: '#1e293b'}}>{b.label}</span>
                    </div>
                )) : (
                    <div style={{padding:'20px', textAlign:'center', color:'#94a3b8', fontStyle:'italic', width:'100%'}}>
                        Start taking tests to earn your first badge!
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}

export default Profile;