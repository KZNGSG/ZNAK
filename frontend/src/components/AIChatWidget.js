import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2, Send, Bot, User } from 'lucide-react';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AIChatWidget = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Привет! Я Алекс, консультант по маркировке из ПроМаркируй 👋\n\nРасскажите, какой товар продаёте и где — помогу разобраться с маркировкой!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [chatKitReady, setChatKitReady] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatKitRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize ChatKit session when widget opens
  const initChatKit = useCallback(async () => {
    if (clientSecret) return; // Already initialized

    try {
      const response = await fetch(`${API_URL}/api/chatkit/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        setClientSecret(data.client_secret);
        setChatKitReady(true);
        console.log('ChatKit session created');
      } else {
        console.error('Failed to create ChatKit session');
        setChatKitReady(false);
      }
    } catch (error) {
      console.error('ChatKit init error:', error);
      setChatKitReady(false);
    }
  }, [clientSecret]);

  useEffect(() => {
    if (isOpen) {
      initChatKit();
    }
  }, [isOpen, initChatKit]);

  // Check if ChatKit global object is available
  useEffect(() => {
    const checkChatKit = () => {
      if (window.ChatKit) {
        console.log('ChatKit loaded');
        setChatKitReady(true);
      }
    };

    // Check immediately and then periodically
    checkChatKit();
    const interval = setInterval(checkChatKit, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // If ChatKit is ready and we have a client_secret, use the embedded ChatKit
      // Otherwise fallback to our API endpoint
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка сервера');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте позже или свяжитесь с нами через форму обратной связи.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-50))]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[rgb(var(--brand-yellow-200))]">
              <Sparkles size={24} className="text-[rgb(var(--grey-900))]" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[rgb(var(--black))]">AI-эксперт по маркировке</h2>
              <p className="text-xs text-[rgb(var(--grey-600))]">Powered by GPT</p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-[rgb(var(--brand-yellow-200))]"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center">
                  <Bot size={18} className="text-[rgb(var(--grey-800))]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[rgb(var(--grey-900))] text-white'
                    : 'bg-[rgb(var(--grey-100))] text-[rgb(var(--grey-900))]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--grey-200))] flex items-center justify-center">
                  <User size={18} className="text-[rgb(var(--grey-600))]" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center">
                <Bot size={18} className="text-[rgb(var(--grey-800))]" />
              </div>
              <div className="bg-[rgb(var(--grey-100))] rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[rgb(var(--brand-yellow-600))]" />
                  <span className="text-sm text-[rgb(var(--grey-500))]">Думаю...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Задайте вопрос о маркировке..."
              className="flex-1 px-4 py-3 rounded-xl border-2 border-[rgb(var(--grey-200))] focus:outline-none focus:border-[rgb(var(--brand-yellow-500))] transition-colors text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn-gradient rounded-xl px-4"
            >
              <Send size={18} />
            </Button>
          </div>
          <p className="text-xs text-[rgb(var(--grey-400))] mt-2 text-center">
            AI может ошибаться. Проверяйте важную информацию.
          </p>
        </form>
      </div>
    </div>
  );
};

export default AIChatWidget;
