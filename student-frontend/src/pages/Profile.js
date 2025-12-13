import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Edit3, Save, MapPin, Smile, Star, Book, Briefcase } from 'lucide-react';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({ 
    name: '', 
    grade: '', 
    school: '', 
    favorite_subject: '', 
    dream_job: '', 
    hobbies: '' 
  });

  // Stats State (for Badges)
  const [stats, setStats] = useState({ totalTests: 0, bestScore: 0 });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    
    // 1. Get Current User
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // 2. Fetch Profile for THIS User
        const { data: profileData } = await supabase
          .from('student_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) setProfile(profileData);

        // 3. Fetch History for THIS User to calculate badges
        const { data: historyData } = await supabase
          .from('student_progress')
          .select('total_predicted_marks')
          .eq('user_id', user.id);
        
        if (historyData) {
            const scores = historyData.map(h => h.total_predicted_marks || 0);
            setStats({
                totalTests: historyData.length,
                bestScore: scores.length > 0 ? Math.max(...scores) : 0
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
          .upsert({ 
              user_id: user.id, // Link data to this user
              ...profile 
          }, { onConflict: 'user_id' });

        if (!error) {
            setEditing(false);
            alert("Passport Stamped & Saved! 🌍");
        } else {
            alert("Error saving profile. Check console.");
            console.error(error);
        }
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Badge Logic
  const getBadges = () => {
    let badges = [];
    if (stats.totalTests >= 1) badges.push({ icon: "🏁", label: "Starter" });
    if (stats.totalTests >= 5) badges.push({ icon: "📚", label: "Scholar" });
    if (stats.bestScore >= 40) badges.push({ icon: "⭐", label: "Rising Star" });
    if (stats.bestScore >= 80) badges.push({ icon: "🚀", label: "Ace" });
    if (profile.dream_job) badges.push({ icon: "🎯", label: "Dreamer" });
    return badges;
  };

  if (loading) return (
    <div className="page-container" style={{textAlign:'center', paddingTop:'50px'}}>
        <h2>Loading Passport... ✈️</h2>
    </div>
  );

  return (
    <div className="page-container">
      {/* HEADER */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{margin:0}}>🛂 My Passport</h1>
        <button 
            className="btn-primary" 
            onClick={() => editing ? handleSave() : setEditing(true)} 
            style={{width: 'auto', marginTop: 0, padding: '10px 20px', display:'flex', alignItems:'center', gap:'8px'}}
        >
            {editing ? <><Save size={18}/> Save Changes</> : <><Edit3 size={18}/> Edit Info</>}
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px'}}>
        
        {/* LEFT CARD: ID BADGE */}
        <div className="card" style={{textAlign: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)'}}>
            <div style={{
                width: '120px', height: '120px', background: '#bfdbfe', borderRadius: '50%', margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', 
                border: '5px solid white', boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
            }}>
                {profile.name ? profile.name[0].toUpperCase() : "🙂"}
            </div>
            
            {editing ? (
                <div style={{textAlign: 'left'}}>
                    <label style={{fontSize:'0.9rem', color:'#64748b'}}>Full Name</label>
                    <input name="name" value={profile.name} onChange={handleChange} placeholder="e.g. Ayush" style={{marginBottom:'10px'}}/>
                    
                    <label style={{fontSize:'0.9rem', color:'#64748b'}}>Grade / Class</label>
                    <input name="grade" value={profile.grade} onChange={handleChange} placeholder="e.g. 5" style={{marginBottom:'10px'}}/>
                    
                    <label style={{fontSize:'0.9rem', color:'#64748b'}}>School Name</label>
                    <input name="school" value={profile.school} onChange={handleChange} placeholder="e.g. DPS" />
                </div>
            ) : (
                <>
                    <h2 style={{color: '#1e293b', marginBottom: '5px', fontSize:'1.5rem'}}>{profile.name || "Unknown Student"}</h2>
                    <p style={{color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', margin:'5px 0 15px 0'}}>
                        <MapPin size={16}/> {profile.school || "No School Added"}
                    </p>
                    <span style={{background: '#dbeafe', color: '#1e40af', padding: '5px 15px', borderRadius: '15px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        {profile.grade ? `${profile.grade}th Grade` : "Grade ?"}
                    </span>
                </>
            )}
        </div>

        {/* RIGHT CARD: DETAILS & TROPHIES */}
        <div className="card">
            <h3 style={{display:'flex', alignItems:'center', gap:'10px', marginTop:0, color:'#334155'}}>
                <Smile color="#ec4899" size={24}/> Fun Facts
            </h3>
            
            {editing ? (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom:'20px'}}>
                    <div>
                        <label>Fav Subject</label>
                        <input name="favorite_subject" value={profile.favorite_subject} onChange={handleChange} placeholder="Math"/>
                    </div>
                    <div>
                        <label>Dream Job</label>
                        <input name="dream_job" value={profile.dream_job} onChange={handleChange} placeholder="Astronaut"/>
                    </div>
                    <div style={{gridColumn: 'span 2'}}>
                        <label>Hobbies</label>
                        <input name="hobbies" value={profile.hobbies} onChange={handleChange} placeholder="Cricket, Drawing..."/>
                    </div>
                </div>
            ) : (
                <div style={{background: '#f8fafc', padding: '20px', borderRadius: '20px', marginBottom: '25px', display:'grid', gap:'10px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <Book size={18} color="#3b82f6"/> 
                        <strong>Fav Subject:</strong> {profile.favorite_subject || "Not set"}
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <Briefcase size={18} color="#8b5cf6"/> 
                        <strong>Dream Job:</strong> {profile.dream_job || "Not set"}
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <Star size={18} color="#eab308"/> 
                        <strong>Hobbies:</strong> {profile.hobbies || "Not set"}
                    </div>
                </div>
            )}

            <h3 style={{display:'flex', alignItems:'center', gap:'10px', color:'#334155'}}>
                <div style={{background:'#fef3c7', padding:'5px', borderRadius:'50%'}}>🏆</div> Badge Collection
            </h3>
            
            <div className="badges-container" style={{justifyContent: 'flex-start'}}>
                {getBadges().length > 0 ? getBadges().map((b, i) => (
                    <div key={i} className="badge-item">
                        <span className="badge-icon">{b.icon}</span>
                        <span className="badge-label">{b.label}</span>
                    </div>
                )) : (
                    <div style={{textAlign:'center', width:'100%', color:'#94a3b8', fontStyle:'italic', padding:'20px'}}>
                        Complete missions in the Exam Hall to earn badges!
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;