import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { CheckCircle, Mail, Phone, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ContactPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    request_type: '',
    comment: '',
    consent: false
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requestTypes = [
    'Консультация по маркировке',
    'Подключение к Честному ЗНАКу',
    'Оснащение производства/склада',
    'Сопровождение импорта',
    'Другое'
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Укажите ваше имя');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Укажите телефон');
      return;
    }
    if (!formData.request_type) {
      toast.error('Выберите тип запроса');
      return;
    }
    if (!formData.consent) {
      toast.error('Необходимо согласие на обработку данных');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/contact/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
        toast.success('Заявка успешно отправлена!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка отправки заявки');
      }
    } catch (error) {
      toast.error('Ошибка отправки заявки');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-20 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <div className="mx-auto max-w-[600px] px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[16px] p-8 sm:p-12 border border-gray-200 shadow-[var(--shadow-layer)] text-center">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 mb-6">
              <CheckCircle className="text-emerald-600" size={48} />
            </div>
            <h1 className="text-3xl font-semibold text-primary mb-4">Спасибо! Ваша заявка принята</h1>
            <p className="text-gray-600 mb-8">
              Мы свяжемся с вами в ближайшее время по указанному номеру телефона.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="btn-gradient rounded-[12px]"
              data-testid="back-to-home"
            >
              Вернуться на главную
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-[700px] px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Назад</span>
        </button>

        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-primary mb-2">Оставьте заявку</h1>
          <p className="text-gray-600">Свяжемся с вами в течение 2 часов</p>
        </div>

        <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
          <form onSubmit={handleSubmit} data-testid="contact-form">
            <div className="space-y-5">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-base font-semibold text-primary mb-2 block">
                  Имя <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Иван Иванов"
                  className="rounded-[12px]"
                  data-testid="name-input"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-base font-semibold text-primary mb-2 block">
                  Телефон <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);
                    if (value.length > 0 && value[0] !== '7') value = '7' + value;
                    let formatted = '+7';
                    if (value.length > 1) formatted += ' (' + value.slice(1, 4);
                    if (value.length >= 5) formatted += ') ' + value.slice(4, 7);
                    if (value.length >= 8) formatted += '-' + value.slice(7, 9);
                    if (value.length >= 10) formatted += '-' + value.slice(9, 11);
                    handleChange('phone', formatted);
                  }}
                  placeholder="+7 (___) ___-__-__"
                  className="rounded-[12px]"
                  data-testid="phone-input"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-base font-semibold text-primary mb-2 block">
                  Email (необязательно)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="example@mail.ru"
                  className="rounded-[12px]"
                  data-testid="email-input"
                />
              </div>

              {/* Request Type */}
              <div>
                <Label htmlFor="request_type" className="text-base font-semibold text-primary mb-2 block">
                  Тип запроса <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.request_type} onValueChange={(value) => handleChange('request_type', value)}>
                  <SelectTrigger className="w-full rounded-[12px]" data-testid="request-type-select">
                    <SelectValue placeholder="Выберите тип запроса" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Comment */}
              <div>
                <Label htmlFor="comment" className="text-base font-semibold text-primary mb-2 block">
                  Комментарий (необязательно)
                </Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => handleChange('comment', e.target.value)}
                  placeholder="Расскажите подробнее о вашей задаче..."
                  className="rounded-[12px] min-h-[120px]"
                  data-testid="comment-textarea"
                />
              </div>

              {/* Consent */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <Checkbox
                  id="consent"
                  checked={formData.consent}
                  onCheckedChange={(checked) => handleChange('consent', checked)}
                  data-testid="consent-checkbox"
                  required
                />
                <Label htmlFor="consent" className="cursor-pointer text-sm text-gray-700 leading-relaxed">
                  Я согласен на обработку персональных данных и получение информационных сообщений
                  <span className="text-rose-500"> *</span>
                </Label>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="btn-gradient rounded-[12px] w-full"
                  disabled={loading}
                  data-testid="contact-form-submit-button"
                >
                  {loading ? 'Отправка...' : 'Отправить заявку'}
                </Button>
              </div>
            </div>
          </form>

          {/* Contact Info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="text-primary" size={20} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <a href="mailto:info@promarkirui.ru" className="text-sm font-medium text-primary hover:underline">
                    info@promarkirui.ru
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Phone className="text-accent" size={20} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Время ответа</div>
                  <div className="text-sm font-medium text-primary">В течение 2 часов</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
