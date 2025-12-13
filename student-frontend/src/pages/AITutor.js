import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send } from 'lucide-react';

function AITutor() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Buddy! 🤖 Ask me anything about Math, Science, or History!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
        const response = await fetch('http://127.0.0.1:8000/chat_with_tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, grade_level: "5" })
        });
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Oops! My brain froze. Try again? 🧊" }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="page-container">
        <header style={{textAlign: 'center', marginBottom: '20px'}}>
            <h1 style={{fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                <Sparkles color="#eab308"/> AI Study Buddy
            </h1>
            <p style={{color: '#64748b'}}>I can help you with homework!</p>
        </header>

        <div className="chat-container">
            <div className="chat-box">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        {m.content}
                    </div>
                ))}
                {loading && <div className="message assistant">Thinking... 🤔</div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
                <input 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    placeholder="Ask me: 'How do plants grow?'..." 
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button className="btn-primary" onClick={sendMessage} style={{marginTop: 0, borderRadius: '50%', width: '50px', height: '50px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Send size={20}/>
                </button>
            </div>
        </div>
    </div>
  );
}
export default AITutor;