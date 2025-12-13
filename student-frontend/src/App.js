import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; 
import { LayoutDashboard, User, BookOpen, Sparkles, LineChart, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast'; // <--- IMPORT THIS
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TestCorner from './pages/TestCorner';
import Prediction from './pages/Prediction';
import AITutor from './pages/AITutor';
import Login from './pages/Login';
import './App.css';

function NavItem({ to, icon, label }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <li>
            <Link to={to} className={isActive ? "active" : ""}>
                <div className="nav-icon">{icon}</div>
                <span className="nav-label">{label}</span>
            </Link>
        </li>
    );
}

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // IF NO USER, SHOW LOGIN SCREEN
  if (!session) {
    return (
      <>
        <Toaster position="top-center" reverseOrder={false} />
        <Login />
      </>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      
      <div className="app-layout">
        
        {/* MOBILE HEADER */}
        <header className="mobile-top-bar">
            <div className="logo-mobile">🦁 Junior Genius</div>
            <button className="logout-icon-mobile" onClick={handleLogout}>
                <LogOut size={20} color="#ef4444"/>
            </button>
        </header>

        {/* NAVIGATION */}
        <nav className="sidebar">
          <div className="logo-desktop">🦁 Junior Genius</div>
          
          <ul className="nav-links">
            <NavItem to="/" icon={<LayoutDashboard size={24}/>} label="Home" />
            <NavItem to="/profile" icon={<User size={24}/>} label="Profile" />
            <NavItem to="/predict" icon={<LineChart size={24}/>} label="Stats" />
            <NavItem to="/test-corner" icon={<BookOpen size={24}/>} label="Tests" />
            <NavItem to="/ai-tutor" icon={<Sparkles size={24}/>} label="AI" />
          </ul>
          
          <button className="logout-btn-desktop" onClick={handleLogout}>
            <LogOut size={20}/> <span className="nav-label">Log Out</span>
          </button>
        </nav>
        
        {/* MAIN CONTENT */}
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
}

export default App;