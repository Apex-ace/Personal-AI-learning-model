import React, { useState } from 'react';
import { API_BASE_URL } from '../config'; 
import { toast } from 'react-hot-toast'; 
import { 
    BookOpen, CheckCircle, XCircle, Calculator, PenTool, 
    Layers, ClipboardList, School, ArrowLeft, RefreshCw
} from 'lucide-react';

function TestCorner() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);

  // --- 1. EXAM CONFIGURATION ---
  const subjects = [
      { 
          id: 'math', 
          name: 'Math Score', 
          maxMarks: 100, 
          questionsNeeded: 10, 
          marksPerQuestion: 10, 
          topic: 'Grade 5 Mathematics', 
          icon: <Calculator size={28}/>, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' 
      },
      { 
          id: 'reading', 
          name: 'Reading Score', 
          maxMarks: 100, 
          questionsNeeded: 10, 
          marksPerQuestion: 10, 
          topic: 'Reading Comprehension', 
          icon: <BookOpen size={28}/>, color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' 
      },
      { 
          id: 'writing', 
          name: 'Writing Score', 
          maxMarks: 100, 
          questionsNeeded: 10, 
          marksPerQuestion: 10, 
          topic: 'English Grammar', 
          icon: <PenTool size={28}/>, color: '#eab308', bg: '#fefce8', border: '#fde047' 
      },
      { 
          id: 'internal1', 
          name: 'Internal Test 1', 
          maxMarks: 40, 
          questionsNeeded: 10, 
          marksPerQuestion: 4, 
          topic: 'General Science', 
          icon: <Layers size={28}/>, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' 
      },
      { 
          id: 'internal2', 
          name: 'Internal Test 2', 
          maxMarks: 40, 
          questionsNeeded: 10, 
          marksPerQuestion: 4, 
          topic: 'Social Studies', 
          icon: <Layers size={28}/>, color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff' 
      },
      { 
          id: 'assignment', 
          name: 'Assignment', 
          maxMarks: 10, 
          questionsNeeded: 10, 
          marksPerQuestion: 1, 
          topic: 'Logical Reasoning', 
          icon: <ClipboardList size={28}/>, color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' 
      },
  ];

  const generateTest = async (subject) => {
    setLoading(true);
    setQuestions([]);
    setScore(null);
    setCorrectCount(0);
    setAnswers({});
    setIsSubmitted(false);
    setActiveSubject(subject);
    
    const loadingToast = toast.loading(`Generating Exam...`);

    try {
        // 1. We ask for the question count inside the TOPIC string
        const promptTopic = `${subject.topic}. IMPORTANT: Return exactly ${subject.questionsNeeded} distinct questions in JSON format.`;

        // 2. We send ONLY topic and grade_level (Removing num_questions prevents the 422 Error)
        const res = await fetch(`${API_BASE_URL}/generate_full_test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                topic: promptTopic, 
                grade_level: "5"
                // REMOVED: num_questions (This was causing the error)
            })
        });
        
        if (!res.ok) throw new Error("Server error or format rejected");

        const data = await res.json();
        
        let parsedQuestions = [];
        if (data.test_json) {
             let cleanJson = data.test_json.replace(/```json/g, '').replace(/```/g, '').trim();
             parsedQuestions = JSON.parse(cleanJson);
        } else if (Array.isArray(data)) {
             parsedQuestions = data;
        } else {
             parsedQuestions = data.questions || [];
        }
        
        // Safety: If AI ignored the count, slice or duplicate? (Usually AI obeys the prompt)
        setQuestions(parsedQuestions);
        toast.dismiss(loadingToast);
        toast.success(`Exam Ready! 🍀`);

    } catch (err) {
        console.error(err);
        toast.dismiss(loadingToast);
        toast.error("AI connection failed. Check console.");
        setActiveSubject(null); 
    } finally {
        setLoading(false);
    }
  };

  const submitTest = () => {
      if (Object.keys(answers).length < questions.length) {
          toast.error(`Please answer all ${questions.length} questions!`);
          return;
      }

      let rawCorrect = 0;
      questions.forEach((q, index) => {
          if (answers[index] === q.answer) rawCorrect++;
      });
      setCorrectCount(rawCorrect);

      const finalScore = rawCorrect * activeSubject.marksPerQuestion;
      
      setScore(finalScore);
      setIsSubmitted(true);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      if (finalScore >= (activeSubject.maxMarks / 2)) {
          toast.success(`Passed! Score: ${finalScore}/${activeSubject.maxMarks}`);
      } else {
          toast("Keep practicing! 💪");
      }
  };

  const getButtonColor = (qIndex, option) => {
      if (!isSubmitted) return answers[qIndex] === option ? '#dbeafe' : 'white';
      const correctAnswer = questions[qIndex].answer;
      const userAnswer = answers[qIndex];
      if (option === correctAnswer) return '#dcfce7'; 
      if (option === userAnswer && userAnswer !== correctAnswer) return '#fee2e2'; 
      return '#f1f5f9';
  };

  const getButtonBorder = (qIndex, option) => {
      if (!isSubmitted) return answers[qIndex] === option ? '2px solid #3b82f6' : '1px solid #e2e8f0';
      const correctAnswer = questions[qIndex].answer;
      const userAnswer = answers[qIndex];
      if (option === correctAnswer) return '2px solid #22c55e'; 
      if (option === userAnswer && userAnswer !== correctAnswer) return '2px solid #ef4444'; 
      return '1px solid #e2e8f0';
  };

  return (
    <div className="page-container" style={{maxWidth: '1000px', margin: '0 auto', padding: '20px', paddingBottom: '80px'}}>
        
        {/* --- HEADER --- */}
        {!questions.length && (
            <div style={{textAlign: 'center', marginBottom: '30px', marginTop: '10px'}}>
                <h1 style={{fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#1e293b', marginBottom: '10px'}}>
                    <School size={36} color="#ea580c"/> Exam Hall
                </h1>
                <p style={{color: '#64748b', fontSize: '1rem', margin: '0 10px'}}>
                    Select an exam to predict your score.
                </p>
            </div>
        )}

        {/* --- EXAM HALL DASHBOARD --- */}
        {!questions.length && !loading && (
            <div style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '15px'
            }}>
                {subjects.map((sub) => (
                    <div key={sub.id} onClick={() => generateTest(sub)} style={{
                        background: sub.bg,
                        border: `2px solid ${sub.border}`,
                        borderBottom: `5px solid ${sub.border}`,
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                        cursor: 'pointer', transition: 'transform 0.1s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            background: 'white', padding: '15px', borderRadius: '50%', 
                            color: sub.color, boxShadow: `0 2px 5px ${sub.border}`
                        }}>
                            {sub.icon}
                        </div>
                        <h3 style={{margin: 0, fontSize: '1.2rem', color: '#334155'}}>{sub.name}</h3>
                        
                        <div style={{display:'flex', gap:'8px', marginTop:'5px'}}>
                             <div style={{
                                background: 'white', padding: '4px 8px', borderRadius: '6px', 
                                fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', border: `1px solid ${sub.border}`
                            }}>
                                {sub.questionsNeeded} Qs
                            </div>
                            <div style={{
                                background: 'white', padding: '4px 8px', borderRadius: '6px', 
                                fontSize: '0.75rem', fontWeight: 'bold', color: sub.color, border: `1px solid ${sub.border}`
                            }}>
                                Max: {sub.maxMarks}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- LOADING --- */}
        {loading && (
            <div style={{textAlign: 'center', marginTop: '60px'}}>
                <div className="loader" style={{marginBottom: '20px'}}></div>
                <h2>Generating Paper...</h2>
                <p style={{color: '#64748b', fontSize: '0.9rem'}}>Creating questions for {activeSubject?.name}</p>
            </div>
        )}

        {/* --- QUIZ & REVIEW MODE --- */}
        {questions.length > 0 && (
            <div className="card" style={{padding: '15px'}}> 
                <button onClick={() => {setQuestions([]); setActiveSubject(null); setScore(null);}} 
                    style={{background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', cursor: 'pointer', marginBottom: '20px', fontSize: '1rem', padding: '10px 0'}}>
                    <ArrowLeft size={20}/> Quit Exam
                </button>

                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                    <h2 style={{color: '#3b82f6', margin: 0, fontSize: '1.5rem'}}>{activeSubject?.name}</h2>
                    <span style={{fontSize: '0.85rem', color: '#64748b'}}>
                        {questions.length} Questions • {activeSubject?.marksPerQuestion} Marks each
                    </span>
                </div>

                {isSubmitted && (
                    <div style={{
                        background: '#fff7ed', border: '2px solid #f97316',
                        borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '30px'
                    }}>
                        <div style={{fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px'}}>Final Score</div>
                        <h2 style={{margin: '5px 0', fontSize: '2.5rem', color: '#ea580c'}}>
                            {score} <span style={{fontSize: '1.2rem', color: '#9a3412', fontWeight: 'normal'}}>/ {activeSubject?.maxMarks}</span>
                        </h2>
                        <div style={{marginTop: '5px', fontSize: '0.9rem', color: '#4b5563'}}>
                            {correctCount} correct answers
                        </div>
                    </div>
                )}

                {questions.map((q, i) => (
                    <div key={i} style={{marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9'}}>
                        <p style={{fontWeight: 'bold', fontSize: '1rem', marginBottom: '15px', color: '#334155', lineHeight: '1.5'}}>
                            <span style={{color: '#3b82f6', marginRight:'8px'}}>Q{i + 1}.</span> {q.question}
                        </p>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            {q.options.map((opt) => (
                                <button key={opt} disabled={isSubmitted} onClick={() => setAnswers({...answers, [i]: opt})}
                                    style={{
                                        padding: '14px', borderRadius: '10px', 
                                        border: getButtonBorder(i, opt),
                                        backgroundColor: getButtonColor(i, opt),
                                        color: '#1e293b', textAlign: 'left', position: 'relative', 
                                        cursor: isSubmitted ? 'default' : 'pointer', fontSize: '0.95rem',
                                        transition: '0.2s'
                                    }}>
                                    {opt}
                                    {isSubmitted && opt === q.answer && <CheckCircle size={20} color="#16a34a" style={{position:'absolute', right:'10px', top:'12px'}}/>}
                                    {isSubmitted && answers[i] === opt && answers[i] !== q.answer && <XCircle size={20} color="#dc2626" style={{position:'absolute', right:'10px', top:'12px'}}/>}
                                </button>
                            ))}
                        </div>
                        {isSubmitted && answers[i] !== q.answer && (
                            <div style={{marginTop: '12px', padding: '12px', background: '#fff1f2', borderRadius: '8px', borderLeft: '4px solid #f43f5e', color: '#be123c', fontSize: '0.9rem'}}>
                                <strong>Correct:</strong> {q.answer}
                            </div>
                        )}
                    </div>
                ))}

                {!isSubmitted ? (
                    <button onClick={submitTest} className="btn-primary" style={{width: '100%', marginTop: '10px', padding: '16px', fontSize:'1.1rem', borderRadius: '12px'}}>
                        Submit Exam
                    </button>
                ) : (
                    <button onClick={() => {setQuestions([]); setActiveSubject(null); setScore(null);}} className="btn-primary" style={{width: '100%', marginTop: '10px', padding: '16px', fontSize:'1.1rem', borderRadius: '12px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                        <RefreshCw size={20}/> Take Another Test
                    </button>
                )}
            </div>
        )}
    </div>
  );
}

export default TestCorner;