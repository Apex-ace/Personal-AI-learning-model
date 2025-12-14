import React, { useState } from 'react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast'; // <--- IMPORT

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
      if (!error) toast.success("Account created! Logging you in... 🚀");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    }

    if (error) toast.error(error.message);
    setLoading(false);
  };

  return (
    <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FFFBEB', // Updated background
        fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif"
    }}>
      <div className="card" style={{
          maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px',
          background: '#FFF',
          border: '3px solid #E0E7FF', // Soft Indigo border
          borderRadius: '30px',
          boxShadow: '0 8px 0 rgba(0,0,0,0.05)'
      }}>
        <div style={{
            width: '100px', height: '100px', background: 'white', borderRadius: '50%', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
            border: '4px solid #E0F2FE', // Light Blue ring
            boxShadow: '0 4px 0 #E0E7FF'
        }}>
            🦁
        </div>
        <h1 style={{
            color: '#3B82F6', 
            marginBottom: '10px', 
            fontSize: '2rem', 
            fontWeight: '800',
            textShadow: '1px 1px 0 #E0E7FF'
        }}>
            Junior Genius
        </h1>
        <p style={{color: '#64748B', marginBottom: '30px', fontSize: '1.1rem', fontWeight: '600'}}>
            {isSignUp ? "Join the adventure!" : "Welcome back, Champ!"}
        </p>

        <form onSubmit={handleAuth}>
            <input 
                type="email" placeholder="Email Address" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{
                    marginBottom: '15px', width: '100%',
                    padding: '14px', borderRadius: '15px', border: '2px solid #E2E8F0',
                    fontSize: '1rem', outline: 'none', backgroundColor: '#F8FAFC',
                    transition: 'border-color 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#60A5FA'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
            />
            <input 
                type="password" placeholder="Password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{
                    marginBottom: '25px', width: '100%',
                    padding: '14px', borderRadius: '15px', border: '2px solid #E2E8F0',
                    fontSize: '1rem', outline: 'none', backgroundColor: '#F8FAFC',
                    transition: 'border-color 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#60A5FA'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
            />
            <button className="btn-primary" disabled={loading} style={{
                width: '100%', padding: '14px', fontSize: '1.1rem', fontWeight: '700',
                background: '#3B82F6', color: 'white', border: 'none', borderRadius: '16px',
                cursor: 'pointer', boxShadow: '0 4px 0 #1D4ED8', transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Log In")}
            </button>
        </form>

        <p style={{marginTop: '25px', fontSize: '1rem', color: '#64748B', cursor: 'pointer', fontWeight: '600'}} 
           onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
        </p>
      </div>
    </div>
  );
}

export default Login;