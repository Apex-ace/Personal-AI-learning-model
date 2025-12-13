import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; // Import Supabase
import { LayoutDashboard, User, BookOpen, Sparkles, LineChart, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TestCorner from './pages/TestCorner';
import Prediction from './pages/Prediction';
import AITutor from './pages/AITutor';
import Login from './pages/Login'; 
import './App.css';

// Inside src/App.js

function NavItem({ to, icon, label }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
        <li>
            <Link to={to} className={isActive ? "active" : ""}>
                {icon}
                {/* On mobile, we might want to hide the label if screen is TINY, 
                    but the CSS handles font-size perfectly. */}
                <span className="nav-label">{label}</span>
            </Link>
        </li>
    );
}

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // IF NO USER, SHOW LOGIN SCREEN
  if (!session) {
    return <Login />;
  }

  // IF USER LOGGED IN, SHOW APP
  return (
    <Router>
      <div className="app-layout">
        <nav className="sidebar">
          <div className="logo">🦁 Junior Genius</div>
          <ul className="nav-links">
            <NavItem to="/" icon={<LayoutDashboard size={24}/>} label="Mission Control" />
            <NavItem to="/profile" icon={<User size={24}/>} label="My Passport" />
            <NavItem to="/predict" icon={<LineChart size={24}/>} label="Check Stats" />
            <NavItem to="/test-corner" icon={<BookOpen size={24}/>} label="Test Corner" />
            <NavItem to="/ai-tutor" icon={<Sparkles size={24}/>} label="AI Buddy" />
          </ul>
          
          <button onClick={handleLogout} style={{
              marginTop: 'auto', background: '#fee2e2', color: '#ef4444', 
              border: 'none', padding: '10px', borderRadius: '15px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold'
          }}>
            <LogOut size={20}/> Log Out
          </button>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/predict" element={<Prediction />} />
            <Route path="/test-corner" element={<TestCorner />} />
            <Route path="/ai-tutor" element={<AITutor />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}// Inside src/App.js

function NavItem({ to, icon, label }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
        <li>
            <Link to={to} className={isActive ? "active" : ""}>
                {icon}
                {/* On mobile, we might want to hide the label if screen is TINY, 
                    but the CSS handles font-size perfectly. */}
                <span className="nav-label">{label}</span>
            </Link>
        </li>
    );
}

export default App;