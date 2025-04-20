import React, { useState } from 'react';
// Импортируем API URL из конфигурации и getAuthHeader из auth.js
import { API_URL } from '../api/config';
import { getAuthHeader } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import AuctionForm from './AuctionForm.jsx';

const CreateAuction = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (formData) => {
        try {
            setLoading(true);
            setError(null);
            
            // Получаем заголовки аутентификации
            const authHeaders = getAuthHeader();
            
            // Отправляем FormData напрямую
            const response = await fetch(`${API_URL}/api/auction/cars/`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: authHeaders
            });
            
            // Обрабатываем ответ
            if (!response.ok) {
                let errorMessage = 'Произошла ошибка при создании аукциона';
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    } else if (typeof errorData === 'object') {
                        // Обработка ошибок валидации полей
                        errorMessage = Object.entries(errorData)
                            .map(([field, errors]) => {
                                if (Array.isArray(errors)) {
                                    return `${field}: ${errors.join(', ')}`;
                                }
                                return `${field}: ${errors}`;
                            })
                            .join('; ');
                    }
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            // В случае успеха, перенаправляем на страницу успеха
            navigate('/success', { 
                state: { 
                    message: 'Аукцион успешно создан!',
                    backPath: '/',
                    backText: 'Вернуться на главную' 
                } 
            });
        } catch (err) {
            console.error('Error creating auction:', err);
            setError(
                err.message || 
                'Произошла ошибка при создании аукциона'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auctions-page">
            {error && (
                <div className="error-message general-error">
                    <i className="fas fa-exclamation-triangle"></i> {error}
                </div>
            )}
            
            <div className="auction-form-container">
                <AuctionForm 
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default CreateAuction;
