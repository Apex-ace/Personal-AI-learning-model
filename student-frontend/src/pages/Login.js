import React, { useState } from 'react';
import { supabase } from '../supabase';
import { LogIn, UserPlus, Sparkles } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let error;
    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      error = signUpError;
      if (!error) alert("Account created! You can now log in.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    }

    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)'
    }}>
      <div className="card" style={{maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px'}}>
        <div style={{
            width: '80px', height: '80px', background: 'white', borderRadius: '50%', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)'
        }}>
            🦁
        </div>
        <h1 style={{color: '#3b82f6', marginBottom: '10px'}}>Junior Genius</h1>
        <p style={{color: '#64748b', marginBottom: '30px'}}>
            {isSignUp ? "Join the adventure!" : "Welcome back, Champ!"}
        </p>

        <form onSubmit={handleAuth}>
            <input 
                type="email" placeholder="Email Address" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{marginBottom: '15px', width: '100%'}}
            />
            <input 
                type="password" placeholder="Password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{marginBottom: '20px', width: '100%'}}
            />
            <button className="btn-primary" disabled={loading}>
                {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Log In")}
            </button>
        </form>

        <p style={{marginTop: '20px', fontSize: '0.9rem', color: '#64748b', cursor: 'pointer'}} 
           onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
        </p>
      </div>
    </div>
  );
}

export default Login;