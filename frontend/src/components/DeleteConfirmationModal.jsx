import React, { useEffect } from 'react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, auctionTitle }) => {
  // Блокировка прокрутки страницы при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Очистка при размонтировании компонента
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Обработчик нажатия клавиши Escape для закрытия модального окна
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`delete-confirmation-modal ${isOpen ? 'active' : ''}`}>
      <div className="delete-confirmation-content">
        <div className="delete-confirmation-header">
          <h3 className="delete-confirmation-title">Подтверждение удаления</h3>
        </div>
        <div className="delete-confirmation-body">
          <p className="delete-confirmation-message">
            Вы уверены, что хотите удалить аукцион "{auctionTitle}"? Это действие невозможно отменить.
          </p>
        </div>
        <div className="delete-confirmation-actions">
          <button
            className="cancel-delete-button"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="confirm-delete-button"
            onClick={onConfirm}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;