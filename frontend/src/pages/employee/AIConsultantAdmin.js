import React, { useState, useEffect } from 'react';
import { MessageSquare, Settings, Database, Zap, DollarSign, Users, TrendingUp, RefreshCw, Download, FileText, Code, HelpCircle, Globe, ToggleLeft, ToggleRight, Trash2, Plus } from 'lucide-react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

const MAIN_ADMIN_EMAIL = 'damirslk@mail.ru';

const AIConsultantAdmin = () => {
  const { user } = useEmployeeAuth();
  const isMainAdmin = user?.email === MAIN_ADMIN_EMAIL;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [settings, setSettings] = useState({});
  const [localSettings, setLocalSettings] = useState({});
  const [knowledge, setKnowledge] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [dataSources, setDataSources] = useState({ sources: [], grouped: {}, stats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch('/api/ai/stats');
        setStats(await res.json());
      } else if (activeTab === 'conversations') {
        const res = await fetch('/api/ai/conversations');
        setConversations(await res.json());
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/ai/settings');
        const data = await res.json();
        setSettings(data);
        setLocalSettings(data);
      } else if (activeTab === 'knowledge') {
        const [knowledgeRes, sourcesRes] = await Promise.all([
          fetch('/api/ai/knowledge'),
          fetch('/api/ai/data-sources')
        ]);
        setKnowledge(await knowledgeRes.json());
        setDataSources(await sourcesRes.json());
      } else if (activeTab === 'quick-replies') {
        const res = await fetch('/api/ai/quick-replies');
        setQuickReplies(await res.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadConversation = async (id) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      setSelectedConversation(await res.json());
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const updateLocalSetting = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSetting = async (key) => {
    const value = localSettings[key];
    if (value === settings[key]) return;
    try {
      await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: key, setting_value: value })
      });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const updateSettingImmediate = async (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    try {
      await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: key, setting_value: value })
      });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const toggleDataSource = async (id, currentState) => {
    try {
      await fetch(`/api/ai/data-sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState })
      });
      loadData();
    } catch (error) {
      console.error('Error toggling source:', error);
    }
  };

  const exportConversations = async (format = 'json') => {
    try {
      const allData = [];
      for (const conv of conversations) {
        const res = await fetch(`/api/ai/conversations/${conv.id}`);
        const data = await res.json();
        allData.push({
          id: conv.id,
          session_id: conv.session_id,
          status: conv.status,
          client_name: conv.client_name,
          client_phone: conv.client_phone,
          created_at: conv.created_at,
          message_count: conv.message_count,
          messages: data.messages || []
        });
      }

      let content, filename, type;
      if (format === 'json') {
        content = JSON.stringify(allData, null, 2);
        filename = `ai-dialogs-${new Date().toISOString().split('T')[0]}.json`;
        type = 'application/json';
      } else {
        const rows = [['ID', 'Статус', 'Клиент', 'Телефон', 'Дата', 'Роль', 'Сообщение']];
        allData.forEach(conv => {
          conv.messages.forEach(msg => {
            rows.push([conv.id, conv.status, conv.client_name || '', conv.client_phone || '', msg.created_at, msg.role, `"${(msg.content || '').replace(/"/g, '""')}"`]);
          });
        });
        content = rows.map(r => r.join(';')).join('\n');
        filename = `ai-dialogs-${new Date().toISOString().split('T')[0]}.csv`;
        type = 'text/csv;charset=utf-8';
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'marking': return '🏷️';
      case 'ved': return '🚢';
      case 'accounting': return '📊';
      case 'general': return '💬';
      default: return '📁';
    }
  };

  const getCategoryName = (category) => {
    switch (category) {
      case 'marking': return 'Маркировка';
      case 'ved': return 'ВЭД';
      case 'accounting': return 'Бухгалтерия';
      case 'general': return 'Общее';
      default: return category;
    }
  };

  const getSourceTypeIcon = (type) => {
    switch (type) {
      case 'tool': return <Code className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'faq': return <HelpCircle className="w-4 h-4" />;
      case 'api': return <Globe className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Дашборд', icon: TrendingUp },
    { id: 'conversations', label: 'Диалоги', icon: MessageSquare },
    { id: 'settings', label: 'Настройки AI', icon: Settings },
    { id: 'knowledge', label: 'База знаний', icon: Database },
    { id: 'quick-replies', label: 'Быстрые ответы', icon: Zap },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI-Консультант</h1>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        </div>
      ) : (
        <>
          {/* Дашборд */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Диалогов всего</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.conversations?.total || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Сегодня</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.conversations?.today || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Лидов</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.conversations?.leads || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Потрачено</p>
                      <p className="text-2xl font-bold text-gray-900">${stats.tokens?.total_cost_usd?.toFixed(4) || '0'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4">Использование токенов</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Входящих</p>
                    <p className="text-xl font-bold">{stats.tokens?.total_input?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Исходящих</p>
                    <p className="text-xl font-bold">{stats.tokens?.total_output?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Всего</p>
                    <p className="text-xl font-bold text-green-600">${stats.tokens?.total_cost_usd?.toFixed(4) || '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Сегодня</p>
                    <p className="text-xl font-bold text-blue-600">${stats.tokens?.today_cost_usd?.toFixed(4) || '0'}</p>
                  </div>
                </div>
              </div>

              {stats.daily?.length > 0 && (
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold mb-4">Расходы по дням</h3>
                  <div className="space-y-2">
                    {stats.daily.map((day, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-600">{day.date}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">{day.requests} запросов</span>
                          <span className="font-semibold">${day.cost?.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Диалоги */}
          {activeTab === 'conversations' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold">Все диалоги ({conversations.length})</h3>
                  <div className="flex gap-2">
                    <button onClick={() => exportConversations('json')} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      <Download className="w-4 h-4" /> JSON
                    </button>
                    <button onClick={() => exportConversations('csv')} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                  </div>
                </div>
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {conversations.map(conv => (
                    <div key={conv.id} onClick={() => loadConversation(conv.id)} className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedConversation?.conversation?.id === conv.id ? 'bg-yellow-50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${conv.status === 'lead' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {conv.status === 'lead' ? 'Лид' : 'Активный'}
                        </span>
                        <span className="text-xs text-gray-400">{conv.message_count} сообщ.</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{conv.first_message || 'Нет сообщений'}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>{conv.client_name || 'Аноним'}</span>
                        <span>{new Date(conv.last_message_at).toLocaleString('ru')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                {selectedConversation ? (
                  <>
                    <div className="p-4 border-b bg-gray-50">
                      <h3 className="font-semibold">Диалог #{selectedConversation.conversation?.id}</h3>
                      {selectedConversation.conversation?.client_phone && (
                        <p className="text-sm text-gray-600">{selectedConversation.conversation.client_phone}</p>
                      )}
                    </div>
                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                      {selectedConversation.messages?.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <div className="text-xs text-gray-400 mt-1">{new Date(msg.created_at).toLocaleTimeString('ru')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">Выберите диалог</div>
                )}
              </div>
            </div>
          )}

          {/* Настройки */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4">Основные настройки</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя бота</label>
                    <input type="text" value={localSettings.bot_name || ''} onChange={(e) => updateLocalSetting('bot_name', e.target.value)} onBlur={() => saveSetting('bot_name')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Приветствие</label>
                    <textarea value={localSettings.welcome_message || ''} onChange={(e) => updateLocalSetting('welcome_message', e.target.value)} onBlur={() => saveSetting('welcome_message')} rows={2} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400" />
                  </div>
                  {isMainAdmin && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Системный промпт</label>
                        <textarea value={localSettings.system_prompt || ''} onChange={(e) => updateLocalSetting('system_prompt', e.target.value)} onBlur={() => saveSetting('system_prompt')} rows={5} className="w-full px-4 py-2 border rounded-lg font-mono text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                          <select value={localSettings.model || 'claude-sonnet-4-20250514'} onChange={(e) => updateSettingImmediate('model', e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                            <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Температура ({localSettings.temperature || 0.3})</label>
                          <input type="range" min="0" max="1" step="0.1" value={localSettings.temperature || 0.3} onChange={(e) => updateSettingImmediate('temperature', e.target.value)} className="w-full" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={localSettings.is_active === 'true'} onChange={(e) => updateSettingImmediate('is_active', e.target.checked ? 'true' : 'false')} className="w-4 h-4" />
                      <span className="text-sm">Бот активен</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={localSettings.collect_leads === 'true'} onChange={(e) => updateSettingImmediate('collect_leads', e.target.checked ? 'true' : 'false')} className="w-4 h-4" />
                      <span className="text-sm">Собирать лиды</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* База знаний - НОВАЯ ВЕРСИЯ */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              {/* Статистика источников */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Code className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Инструменты</p>
                      <p className="text-2xl font-bold">{dataSources.grouped?.tools?.length || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Документы</p>
                      <p className="text-2xl font-bold">{dataSources.grouped?.documents?.length || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">FAQ</p>
                      <p className="text-2xl font-bold">{knowledge.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Активных</p>
                      <p className="text-2xl font-bold">{dataSources.stats?.active || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Инструменты (Tools) */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-600" />
                    Инструменты (Tools) - функции которые Мария может вызывать
                  </h3>
                </div>
                <div className="divide-y">
                  {dataSources.grouped?.tools?.map(source => (
                    <div key={source.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getCategoryIcon(source.category)}</span>
                        <div>
                          <p className="font-medium text-gray-900">{source.name}</p>
                          <p className="text-sm text-gray-500">{source.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 text-xs bg-gray-100 rounded">{getCategoryName(source.category)}</span>
                        <a href={`/api/ai/documents/${source.id}/download`} download className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200" title="Скачать">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => toggleDataSource(source.id, source.is_active)} className={`p-2 rounded-lg ${source.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {source.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Документы */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Документы - нормативная база для консультаций
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Включите документ чтобы Мария могла искать в нём информацию</p>
                </div>
                <div className="divide-y">
                  {dataSources.grouped?.documents?.map(source => (
                    <div key={source.id} className={`p-4 flex items-center justify-between ${!source.is_active ? 'bg-gray-50 opacity-60' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getCategoryIcon(source.category)}</span>
                        <div>
                          <p className="font-medium text-gray-900">{source.name}</p>
                          <p className="text-sm text-gray-500">{source.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Размер: {formatFileSize(source.file_size)} | Путь: {source.file_path}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 text-xs bg-gray-100 rounded">{getCategoryName(source.category)}</span>
                        <a href={`/api/ai/documents/${source.id}/download`} download className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200" title="Скачать">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => toggleDataSource(source.id, source.is_active)} className={`p-2 rounded-lg transition-colors ${source.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                          {source.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-purple-600" />
                    FAQ - часто задаваемые вопросы ({knowledge.length})
                  </h3>
                  <button className="flex items-center gap-1 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500">
                    <Plus className="w-4 h-4" /> Добавить
                  </button>
                </div>
                <div className="divide-y">
                  {knowledge.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>FAQ пока пуст</p>
                      <p className="text-sm">Добавьте часто задаваемые вопросы и ответы</p>
                    </div>
                  ) : (
                    knowledge.map(item => (
                      <div key={item.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">{item.category}</span>
                          <span className="text-xs text-gray-400">Приоритет: {item.priority}</span>
                        </div>
                        {item.question && <p className="font-medium text-gray-900 mb-1">Q: {item.question}</p>}
                        <p className="text-sm text-gray-600 line-clamp-2">{item.answer}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Быстрые ответы */}
          {activeTab === 'quick-replies' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold">Быстрые ответы ({quickReplies.length})</h3>
                <button className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500">+ Добавить</button>
              </div>
              <div className="divide-y">
                {quickReplies.map(item => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-wrap gap-1">
                        {item.trigger_words.split(',').map((word, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{word.trim()}</span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">Использовано: {item.usage_count}</span>
                    </div>
                    <p className="text-sm text-gray-600">{item.response}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIConsultantAdmin;
