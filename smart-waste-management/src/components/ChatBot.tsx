import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, AlertCircle } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'Hi there! I am **EcoBot**, your Smart Waste AI Companion. Ask me anything about waste classification, recycling rules, environmental impacts, or how to use this platform!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sampleFAQs = [
    'How do I classify plastic waste?',
    'What are the 7 types of recycling?',
    'How do I report illegal dumping?',
    'Why is SDG 11 important?'
  ];

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content })).slice(-6) // keep history short
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (error) {
      console.error('Chat bot network error:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Apologies, my synaptic connection is temporarily saturated. Please try again in a moment!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="chatbot-root" className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-emerald-gradient text-white rounded-full p-4 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group ring-4 ring-emerald-500/10 cursor-pointer"
        >
          <Bot className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-medium text-sm whitespace-nowrap">
            Ask EcoBot AI
          </span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] rounded-2xl border border-gray-200/80 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Header */}
          <div className="bg-emerald-gradient border-b border-emerald-700 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1">
                  EcoBot AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h4>
                <span className="text-[10px] text-emerald-100 font-medium">SDG 11 City Consultant</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-emerald-100 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" style={{ scrollbarWidth: 'thin' }}>
            {messages.map((m, idx) => {
              const isBot = m.role === 'model';
              return (
                <div key={idx} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                    isBot 
                      ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-none' 
                      : 'bg-emerald-gradient text-white rounded-tr-none'
                  }`}>
                    {/* Render basic markdown bold styling simply */}
                    {m.content.split('\n').map((para, pIdx) => {
                      // format bold tags
                      let formatted = para.replace(/\*\*(.*?)\*\*/g, '$1');
                      return (
                        <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
                          {formatted}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-250 rounded-2xl rounded-tl-none p-3 text-xs text-gray-500 flex items-center gap-2 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span>EcoBot is formulating advice...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick FAQ Chips */}
          {messages.length < 3 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1.5">Common Inquiries:</span>
              <div className="flex flex-wrap gap-1.5">
                {sampleFAQs.map((faq, fIdx) => (
                  <button
                    key={fIdx}
                    onClick={() => handleSend(faq)}
                    className="text-[10px] bg-white hover:bg-gray-100 text-emerald-700 border border-gray-250 rounded-full px-2.5 py-1 text-left transition-colors truncate max-w-full shadow-sm cursor-pointer"
                  >
                    {faq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 border-t border-gray-200 bg-white flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your civic query here..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-emerald-gradient text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
