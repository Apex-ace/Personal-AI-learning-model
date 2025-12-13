import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

function AITutor() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hi there! 👋 I'm your AI Study Buddy! Ask me anything about Math, Science, or History and I'll explain it simply! 🚀" 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/chat_with_tutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, grade_level: "5" })
        });
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Oops! My brain froze. 🧊 Try asking again!" }]);
    } finally {
        setLoading(false);
    }
  };

  const clearChat = () => {
      if(window.confirm("Clear all messages?")) {
          setMessages([{ role: 'assistant', content: "Chat cleared! What shall we learn next? 🌟" }]);
      }
  };

  return (
    <div className="page-container" style={{height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column'}}>
        
        {/* --- HEADER --- */}
        <header style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            marginBottom: '15px', padding: '0 10px'
        }}>
            <div>
                <h1 style={{margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6'}}>
                    <Bot size={32} color="#3b82f6"/> AI Buddy
                </h1>
                <p style={{margin: 0, color: '#64748b', fontSize: '0.9rem'}}>Always here to help!</p>
            </div>
            <button onClick={clearChat} style={{
                background: '#fee2e2', border: 'none', color: '#ef4444', 
                padding: '8px', borderRadius: '50%', cursor: 'pointer'
            }}>
                <Trash2 size={18}/>
            </button>
        </header>

        {/* --- CHAT WINDOW --- */}
        <div className="card" style={{
            flex: 1, display: 'flex', flexDirection: 'column', 
            padding: 0, overflow: 'hidden', border: '4px solid #e0f2fe',
            background: '#f8fafc'
        }}>
            
            {/* MESSAGES AREA */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '20px', 
                display: 'flex', flexDirection: 'column', gap: '20px'
            }}>
                {messages.map((m, i) => (
                    <div key={i} style={{
                        display: 'flex', 
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: '10px'
                    }}>
                        {/* BOT AVATAR (Left) */}
                        {m.role === 'assistant' && (
                            <div style={{
                                width: '35px', height: '35px', borderRadius: '50%', 
                                background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #fcd34d', flexShrink: 0
                            }}>
                                <Bot size={20} color="#b45309"/>
                            </div>
                        )}

                        {/* BUBBLE */}
                        <div style={{
                            maxWidth: '75%',
                            padding: '15px 20px',
                            borderRadius: m.role === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0',
                            background: m.role === 'user' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                            color: m.role === 'user' ? 'white' : '#1e293b',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            fontSize: '1rem',
                            lineHeight: '1.5',
                            border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
                        }}>
                            {m.content}
                        </div>

                        {/* USER AVATAR (Right) */}
                        {m.role === 'user' && (
                            <div style={{
                                width: '35px', height: '35px', borderRadius: '50%', 
                                background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #3b82f6', flexShrink: 0
                            }}>
                                <User size={20} color="#1e40af"/>
                            </div>
                        )}
                    </div>
                ))}

                {/* TYPING ANIMATION */}
                {loading && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div style={{
                                width: '35px', height: '35px', borderRadius: '50%', 
                                background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #fcd34d'
                            }}>
                                <Bot size={20} color="#b45309"/>
                            </div>
                        <div style={{
                            background: 'white', padding: '10px 20px', borderRadius: '20px 20px 20px 0',
                            border: '1px solid #e2e8f0', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem'
                        }}>
                            Thinking... 🧠
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div style={{
                padding: '15px', background: 'white', borderTop: '1px solid #f1f5f9',
                display: 'flex', gap: '10px', alignItems: 'center'
            }}>
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask me anything..." 
                    style={{
                        margin: 0, flex: 1, borderRadius: '25px', padding: '15px 20px',
                        border: '2px solid #e2e8f0', background: '#f8fafc'
                    }}
                />
                <button 
                    onClick={sendMessage} 
                    disabled={!input.trim() || loading}
                    style={{
                        width: '50px', height: '50px', borderRadius: '50%', 
                        background: input.trim() ? '#3b82f6' : '#e2e8f0', 
                        border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: '0.2s', boxShadow: input.trim() ? '0 4px 10px rgba(59, 130, 246, 0.3)' : 'none'
                    }}
                >
                    <Send size={20} color="white"/>
                </button>
            </div>

        </div>
    </div>
  );
}

export default AITutor;