import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Edit3, Save, MapPin, Smile } from 'lucide-react';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ name: '', grade: '', school: '', favorite_subject: '', dream_job: '', hobbies: '' });
  const [stats, setStats] = useState({ totalTests: 0, bestScore: 0 });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: profileData } = await supabase.from('student_profile').select('*').limit(1).single();
    if (profileData) setProfile(profileData);

    const { data: historyData } = await supabase.from('student_progress').select('total_predicted_marks');
    if (historyData) {
        const scores = historyData.map(h => h.total_predicted_marks || 0);
        setStats({ totalTests: historyData.length, bestScore: scores.length > 0 ? Math.max(...scores) : 0 });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('student_profile').upsert({ id: 1, ...profile });
    if (!error) { setEditing(false); alert("Passport Stamped & Saved! 🌍"); }
  };

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const getBadges = () => {
    let badges = [];
    if (stats.totalTests >= 1) badges.push({ icon: "🏁", label: "Starter" });
    if (stats.totalTests >= 5) badges.push({ icon: "📚", label: "Scholar" });
    if (stats.bestScore >= 80) badges.push({ icon: "🚀", label: "Ace" });
    if (profile.dream_job) badges.push({ icon: "🎯", label: "Dreamer" });
    return badges;
  };

  if (loading) return <div className="page-container" style={{textAlign:'center'}}>Loading Passport... ✈️</div>;

  return (
    <div className="page-container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1>🛂 My Passport</h1>
        <button className="btn-primary" onClick={() => editing ? handleSave() : setEditing(true)} style={{width: 'auto', marginTop: 0}}>
            {editing ? <><Save size={18}/> Save</> : <><Edit3 size={18}/> Edit Info</>}
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px'}}>
        {/* ID CARD */}
        <div className="card" style={{textAlign: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)'}}>
            <div style={{
                width: '120px', height: '120px', background: '#bfdbfe', borderRadius: '50%', margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', border: '5px solid white', boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
            }}>
                {profile.name ? profile.name[0].toUpperCase() : "🙂"}
            </div>
            
            {editing ? (
                <div style={{textAlign: 'left'}}>
                    <label>Name</label><input name="name" value={profile.name} onChange={handleChange} style={{marginBottom:'10px'}}/>
                    <label>Grade</label><input name="grade" value={profile.grade} onChange={handleChange} style={{marginBottom:'10px'}}/>
                    <label>School</label><input name="school" value={profile.school} onChange={handleChange} />
                </div>
            ) : (
                <>
                    <h2 style={{color: '#1e293b', marginBottom: '5px'}}>{profile.name || "Unknown Student"}</h2>
                    <p style={{color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                        <MapPin size={16}/> {profile.school || "No School Added"}
                    </p>
                    <span style={{background: '#dbeafe', color: '#1e40af', padding: '5px 15px', borderRadius: '15px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        {profile.grade ? `${profile.grade}th Grade` : "Grade ?"}
                    </span>
                </>
            )}
        </div>

        {/* DETAILS & BADGES */}
        <div className="card">
            <h3 style={{display:'flex', alignItems:'center', gap:'10px'}}><Smile color="#ec4899"/> Fun Facts</h3>
            {editing ? (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                    <div><label>Fav Subject</label><input name="favorite_subject" value={profile.favorite_subject} onChange={handleChange}/></div>
                    <div><label>Dream Job</label><input name="dream_job" value={profile.dream_job} onChange={handleChange}/></div>
                    <div style={{gridColumn: 'span 2'}}><label>Hobbies</label><input name="hobbies" value={profile.hobbies} onChange={handleChange}/></div>
                </div>
            ) : (
                <div style={{background: '#f8fafc', padding: '20px', borderRadius: '20px', marginBottom: '25px'}}>
                    <p><strong>🎨 Hobbies:</strong> {profile.hobbies || "None yet"}</p>
                    <p><strong>🚀 Dream Job:</strong> {profile.dream_job || "Undecided"}</p>
                    <p><strong>📚 Fav Subject:</strong> {profile.favorite_subject || "Recess?"}</p>
                </div>
            )}

            <h3>🏆 Badge Collection</h3>
            <div className="badges-container" style={{justifyContent: 'flex-start'}}>
                {getBadges().length > 0 ? getBadges().map((b, i) => (
                    <div key={i} className="badge-item">
                        <span className="badge-icon">{b.icon}</span>
                        <span className="badge-label">{b.label}</span>
                    </div>
                )) : <p style={{color: '#94a3b8', fontStyle: 'italic'}}>Complete missions to earn badges!</p>}
            </div>
        </div>
      </div>
    </div>
  );
}
export default Profile;