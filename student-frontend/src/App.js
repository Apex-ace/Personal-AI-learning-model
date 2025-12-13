import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, BookOpen, Sparkles, LineChart } from 'lucide-react'; // Updated Icons
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TestCorner from './pages/TestCorner';
import Prediction from './pages/Prediction';
import AITutor from './pages/AITutor';
import './App.css';

// Helper component to highlight active link
function NavItem({ to, icon, label }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <li>
            <Link to={to} style={isActive ? {background: '#eff6ff', color: '#3b82f6'} : {}}>
                {icon} {label}
            </Link>
        </li>
    );
}

function App() {
  return (
    <Router>
      <div className="app-layout">
        <nav className="sidebar">
          <div className="logo">🦁 Junior Genius</div>
          <ul className="nav-links">
            {/* Using helper for active state styling */}
            <NavItem to="/" icon={<LayoutDashboard size={24}/>} label="Mission Control" />
            <NavItem to="/profile" icon={<User size={24}/>} label="My Passport" />
            <NavItem to="/predict" icon={<LineChart size={24}/>} label="Check Stats" />
            <NavItem to="/test-corner" icon={<BookOpen size={24}/>} label="Test Corner" />
            <NavItem to="/ai-tutor" icon={<Sparkles size={24}/>} label="AI Buddy" />
          </ul>
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
}
export default App;