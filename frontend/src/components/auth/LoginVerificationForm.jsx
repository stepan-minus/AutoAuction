import React, { useState, useEffect, useRef } from 'react';
import { confirmLoginVerification } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/EmailVerification.css';

const LoginVerificationForm = ({ email, onVerificationComplete, onCancel }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут в секундах
  const inputsRef = useRef([]);
  const { updateUserInfo } = useAuth();
  const navigate = useNavigate();

  // Таймер обратного отсчета
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Форматирование времени для отображения
  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Обработка ввода цифр кода
  const handleDigitChange = (index, value) => {
    // Разрешаем только цифры
    if (!/^\d*$/.test(value)) return;
    
    const newDigits = [...codeDigits];
    newDigits[index] = value.slice(0, 1); // Берем только первую цифру
    setCodeDigits(newDigits);

    // Обновляем полный код
    const fullCode = newDigits.join('');
    setVerificationCode(fullCode);
    
    // Автоматический переход к следующему полю
    if (value && index < 5) {
      setActiveIndex(index + 1);
      inputsRef.current[index + 1].focus();
    }
  };

  // Обработка нажатия клавиш
  const handleKeyDown = (index, e) => {
    // Переход назад при нажатии Backspace в пустом поле
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      setActiveIndex(index - 1);
      inputsRef.current[index - 1].focus();
    }
    // Переход назад при нажатии стрелки влево
    else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1);
      inputsRef.current[index - 1].focus();
    }
    // Переход вперед при нажатии стрелки вправо
    else if (e.key === 'ArrowRight' && index < 5) {
      setActiveIndex(index + 1);
      inputsRef.current[index + 1].focus();
    }
  };

  // Обработка вставки кода из буфера
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Проверяем, что вставлены только цифры
    if (!/^\d+$/.test(pastedData)) return;
    
    const digits = pastedData.split('').slice(0, 6);
    const newDigits = [...codeDigits];
    
    // Заполняем доступные поля
    digits.forEach((digit, i) => {
      if (i < 6) newDigits[i] = digit;
    });
    
    setCodeDigits(newDigits);
    setVerificationCode(newDigits.join(''));
    
    // Установка фокуса на последнее заполненное поле или на последнее поле
    const lastFilledIndex = Math.min(digits.length - 1, 5);
    setActiveIndex(lastFilledIndex);
    if (inputsRef.current[lastFilledIndex]) {
      inputsRef.current[lastFilledIndex].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      setError('Пожалуйста, введите полный 6-значный код.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await confirmLoginVerification(email, verificationCode);
      
      // Обновляем информацию о пользователе в контексте
      updateUserInfo(response.user);
      
      if (onVerificationComplete) {
        onVerificationComplete(response.user);
      } else {
        // По умолчанию перенаправляем на главную страницу
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Недействительный или просроченный код. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verification-container">
      <h2>Введите 6-значный код</h2>
      
      <div className="verification-sent-info">
        <i className="fas fa-envelope"></i>
        <span>Мы отправили код на <span className="verification-sent-email">{email}</span></span>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* Реальное поле ввода (скрытое) для форм и валидации */}
        <input 
          type="text" 
          value={verificationCode}
          onChange={() => {}} // Пустой обработчик, т.к. значение уже устанавливается в handleDigitChange
          className="verification-code-hidden"
          maxLength={6}
          required
        />
        
        {/* Визуальное представление полей ввода */}
        <div className="verification-code-container">
          {codeDigits.map((digit, index) => (
            <div 
              key={index} 
              className={`verification-code-box ${index === activeIndex ? 'active' : ''} ${digit ? 'filled' : ''}`}
            >
              <input
                ref={el => inputsRef.current[index] = el}
                type="text"
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={() => setActiveIndex(index)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="verification-code-single"
                maxLength={1}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        
        <div className="verification-actions">
          <button 
            type="submit"
            className="btn-verification btn-primary"
            disabled={loading || timeLeft <= 0 || verificationCode.length !== 6}
          >
            {loading ? 'Проверка...' : 'Продолжить'}
          </button>
        </div>
        
        <div className="verification-timer">
          <button 
            type="button" 
            className="verification-resend"
            onClick={onCancel}
          >
            Назад
          </button>
          
          {timeLeft > 0 ? (
            <span>({formatTime()})</span>
          ) : (
            <button 
              type="button" 
              className="verification-resend"
              onClick={() => {
                // Здесь будет логика повторной отправки
                setTimeLeft(300);
                setCodeDigits(['', '', '', '', '', '']);
                setVerificationCode('');
              }}
            >
              Отправить код ещё раз
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default LoginVerificationForm;