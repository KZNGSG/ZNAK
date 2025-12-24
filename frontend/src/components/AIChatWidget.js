import React, { useState, useEffect, useRef } from 'react';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef(null);
  const hasAutoOpened = useRef(false);

  // Quick Replies - популярные вопросы
  const quickReplies = [
    { text: 'Проверить товар', icon: '🔍' },
    { text: 'Штрафы', icon: '⚠️' },
    { text: 'Получить КП', icon: '📄' },
    { text: 'Сроки маркировки', icon: '📅' }
  ];

  // Персонализированное приветствие по времени суток
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Доброе утро';
    if (hour >= 12 && hour < 18) return 'Добрый день';
    if (hour >= 18 && hour < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  };

  // Приветственное сообщение при открытии
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsLoading(true);
      setTimeout(() => {
        setMessages([{
          role: 'assistant',
          content: `${getGreeting()}! Я Мария, консультант по маркировке) Чем могу помочь?`
        }]);
        setIsLoading(false);
      }, 1200);
    }
  }, [isOpen, messages.length]);

  // Скролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
    hasAutoOpened.current = true;
  };

  // Клик по Quick Reply
  const handleQuickReply = (text) => {
    setShowQuickReplies(false);
    setInputValue(text);
    setTimeout(() => {
      sendMessageDirect(text);
    }, 100);
  };

  const sendMessageDirect = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setIsLoading(true);
    setShowQuickReplies(false);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId,
          current_page: window.location.pathname,
          page_title: document.title
        })
      });

      const data = await response.json();

      if (data.session_id) {
        setSessionId(data.session_id);
      }

      const responseText = data.response || 'Простите, что-то пошло не так. Попробуйте ещё раз)';
      const typingDelay = Math.min(1500 + responseText.length * 15, 3500);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: responseText
        }]);
        setIsLoading(false);
      }, typingDelay);

    } catch (error) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Ой, связь прервалась( Попробуйте ещё раз или напишите нам напрямую'
        }]);
        setIsLoading(false);
      }, 1000);
    }
  };

  const sendMessage = async () => {
    await sendMessageDirect(inputValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Форматирование текста с markdown
  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  // Быстрые действия

  return (
    <>
      {/* Кнопка открытия чата */}
      <button
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #F5C518 0%, #E5B000 100%)',
          boxShadow: '0 4px 20px rgba(245, 197, 24, 0.4)'
        }}
      >
        {isOpen ? (
          <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Окно чата */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            height: '550px',
            maxHeight: 'calc(100vh - 150px)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}
        >
          {/* Заголовок */}
          <div
            className="p-4 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #F5C518 0%, #E5B000 100%)'
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                border: '3px solid #fff'
              }}
            >
              <span className="text-2xl">M</span>
              {/* Онлайн индикатор */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg">Мария</h3>
              <p className="text-xs flex items-center gap-1 text-gray-700">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Онлайн - отвечаю быстро
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-700 hover:text-gray-900 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0 bg-yellow-100 text-yellow-800 font-bold text-sm">
                    M
                  </div>
                )}
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-yellow-400 text-gray-900 rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                  }`}
                >
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
              </div>
            ))}

            {/* Quick Replies после приветствия */}
            {showQuickReplies && messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-3">
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(reply.text)}
                    className="px-3 py-2 bg-white border border-yellow-400 rounded-full text-sm text-gray-700 hover:bg-yellow-50 hover:border-yellow-500 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{reply.icon}</span>
                    <span>{reply.text}</span>
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0 bg-yellow-100 text-yellow-800 font-bold text-sm">
                  M
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <span>Мария печатает</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>


          {/* Поле ввода */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Напишите сообщение..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 text-sm transition-all"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: inputValue.trim()
                    ? 'linear-gradient(135deg, #F5C518 0%, #E5B000 100%)'
                    : '#e5e7eb'
                }}
              >
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
