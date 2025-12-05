import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Sparkles, Loader2, Send } from 'lucide-react';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AIChatWidget = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      initChatKit();
    }
  }, [isOpen]);

  const initChatKit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get client secret from our backend
      const response = await fetch(`${API_URL}/api/chatkit/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to start chat session');
      }

      const { client_secret } = await response.json();

      // Initialize ChatKit if available
      if (window.ChatKit && chatContainerRef.current) {
        // Clear previous instance
        chatContainerRef.current.innerHTML = '';

        // Create ChatKit element
        const chatElement = document.createElement('openai-chatkit');
        chatElement.setAttribute('client-secret', client_secret);
        chatElement.style.width = '100%';
        chatElement.style.height = '100%';

        chatContainerRef.current.appendChild(chatElement);
        setIsLoading(false);
      } else {
        // Fallback: wait for ChatKit to load
        setTimeout(() => {
          if (window.ChatKit && chatContainerRef.current) {
            chatContainerRef.current.innerHTML = '';
            const chatElement = document.createElement('openai-chatkit');
            chatElement.setAttribute('client-secret', client_secret);
            chatElement.style.width = '100%';
            chatElement.style.height = '100%';
            chatContainerRef.current.appendChild(chatElement);
            setIsLoading(false);
          } else {
            setError('ChatKit не загружен. Попробуйте обновить страницу.');
            setIsLoading(false);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('ChatKit init error:', err);
      setError(err.message || 'Не удалось запустить чат. Попробуйте позже.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-50))]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[rgb(var(--brand-yellow-200))]">
              <Sparkles size={24} className="text-[rgb(var(--grey-900))]" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[rgb(var(--black))]">AI-эксперт по маркировке</h2>
              <p className="text-xs text-[rgb(var(--grey-600))]">Задайте любой вопрос о маркировке товаров</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-[rgb(var(--brand-yellow-200))]"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Chat Container */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 size={40} className="animate-spin text-[rgb(var(--brand-yellow-500))]" />
              <p className="text-[rgb(var(--grey-600))]">Подключаемся к AI-эксперту...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
              <div className="p-4 rounded-full bg-red-100">
                <MessageSquare size={32} className="text-red-500" />
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={initChatKit} className="btn-gradient rounded-xl">
                Попробовать снова
              </Button>
            </div>
          )}

          <div
            ref={chatContainerRef}
            className={`w-full h-full ${isLoading || error ? 'hidden' : ''}`}
          />
        </div>
      </div>
    </div>
  );
};

export default AIChatWidget;
