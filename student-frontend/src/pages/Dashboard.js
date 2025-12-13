import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Trophy, TrendingUp, Zap } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Dashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    
    // 1. Get the Current User
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // 2. Fetch data ONLY for this user
        const { data } = await supabase
          .from('student_progress')
          .select('*')
          .eq('user_id', user.id) // <--- THIS FILTERS BY YOUR ID
          .order('created_at', { ascending: true });
        
        if (data) setHistory(data);
    }
    setLoading(false);
  };

  const data = {
    labels: history.map(item => new Date(item.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})),
    datasets: [{
      label: 'My XP Points 🚀',
      data: history.map(item => item.total_predicted_marks),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      fill: true
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { family: 'Fredoka' } } } },
    scales: {
        x: { grid: { display: false } },
        y: { grid: { borderDash: [5, 5] }, beginAtZero: true, max: 100 }
    }
  };

  if (loading) return (
    <div className="page-container" style={{textAlign:'center', paddingTop:'50px'}}>
        <h2>Loading Mission Control... 🛸</h2>
    </div>
  );

  return (
    <div className="page-container">
      <header style={{marginBottom: '30px'}}>
        <h1 style={{fontSize: '2.5rem', marginBottom: '5px'}}>🚀 Mission Control</h1>
        <p style={{color: '#64748b'}}>Ready to learn something new today?</p>
      </header>
      
      {/* 3 Color-Coded Cards */}
      <div className="stats-grid">
        <div className="stat-card">
            <Trophy size={32} color="#eab308" style={{marginBottom:'10px'}}/>
            <h3>Total Missions</h3>
            <p>{history.length}</p>
        </div>
        <div className="stat-card">
            <TrendingUp size={32} color="#22c55e" style={{marginBottom:'10px'}}/>
            <h3>High Score</h3>
            <p>{history.length > 0 ? Math.max(...history.map(h => h.total_predicted_marks || 0)) : 0}</p>
        </div>
        <div className="stat-card">
            <Zap size={32} color="#ec4899" style={{marginBottom:'10px'}}/>
            <h3>Power Level</h3>
            <p>{history.length > 0 ? "Level " + Math.floor(history.length / 2 + 1) : "Level 1"}</p>
        </div>
      </div>

      <div className="card chart-container" style={{height: '400px'}}>
        <h2 style={{marginBottom: '20px'}}>📈 XP Growth Chart</h2>
        <div style={{height: '300px'}}>
            {history.length > 0 ? <Line data={data} options={chartOptions}/> : 
            <div style={{textAlign:'center', padding:'50px', color:'#94a3b8'}}>
                <p>No missions completed yet!</p>
                <p>Go to <strong>Check Stats</strong> to start your first mission.</p>
            </div>}
        </div>
      </div>
    </div>
  );
}
export default Dashboard;