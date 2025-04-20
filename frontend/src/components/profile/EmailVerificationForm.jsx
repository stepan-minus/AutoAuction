import React, { useState, useEffect, useRef } from 'react';
import { requestEmailVerification, confirmEmailVerification } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/EmailVerification.css';

const EmailVerificationForm = ({ onVerificationComplete }) => {
  const { user, updateUserInfo } = useAuth();
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут в секундах
  const inputsRef = useRef([]);

  // Таймер обратного отсчета
  useEffect(() => {
    if (!codeSent || timeLeft <= 0) return;
    
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
  }, [codeSent, timeLeft]);

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

  const handleRequestCode = async (e) => {
    e && e.preventDefault();
    
    setLoading(true);
    setError('');
    setSuccess('');
    setTimeLeft(300); // Сбрасываем таймер
    
    try {
      if (!user.email) {
        throw new Error('Email пользователя не найден');
      }
      
      await requestEmailVerification(user.email);
      setCodeSent(true);
      setShowVerificationForm(true);
      setSuccess('Код подтверждения отправлен на ваш email.');
    } catch (err) {
      console.error('Ошибка при запросе кода верификации:', err);
      setError(err.message || 'Не удалось отправить код. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      setError('Пожалуйста, введите полный 6-значный код.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await confirmEmailVerification(verificationCode);
      
      // Обновляем информацию о пользователе в контексте
      const updatedUser = {
        ...user,
        is_email_verified: true
      };
      updateUserInfo(updatedUser);
      
      setSuccess('Email успешно подтвержден!');
      setShowVerificationForm(false);
      setCodeSent(false);
      
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      setError(err.message || 'Недействительный или просроченный код. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setVerificationCode('');
    setCodeDigits(['', '', '', '', '', '']);
    setCodeSent(false);
    setShowVerificationForm(false);
    setError('');
    setSuccess('');
  };

  // Если email уже подтвержден, не показываем форму
  if (user?.is_email_verified) {
    return (
      <div className="email-verified-container">
        <div className="verified-status">
          <div className="verified-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="verified-text">
            <h3>Email подтвержден</h3>
            <p>Ваш email успешно подтвержден и аккаунт активирован.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="email-verification-container">
      {!showVerificationForm ? (
        <>
          <div className="unverified-header">
            <div className="unverified-badge">
              <i className="fas fa-exclamation-circle"></i>
              <span>Email не подтвержден</span>
            </div>
            <p className="unverified-description">
              Для полного доступа к функциям платформы необходимо подтвердить ваш email адрес.
            </p>
          </div>
          
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              {success}
            </div>
          )}
          
          <button 
            className="btn-verification btn-primary"
            onClick={handleRequestCode}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Отправка...
              </>
            ) : (
              <>
                <i className="fas fa-envelope"></i>
                Подтвердить email
              </>
            )}
          </button>
        </>
      ) : (
        <div className="verification-container">
          <h2>Введите 6-значный код</h2>
          
          <div className="verification-sent-info">
            <i className="fas fa-envelope"></i>
            <span>Мы отправили код на <span className="verification-sent-email">{user.email}</span></span>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleVerifyCode}>
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
                onClick={resetForm}
              >
                Отмена
              </button>
              
              {timeLeft > 0 ? (
                <span>({formatTime()})</span>
              ) : (
                <button 
                  type="button" 
                  className="verification-resend"
                  onClick={handleRequestCode}
                >
                  Отправить код ещё раз
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EmailVerificationForm;