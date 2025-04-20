import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCarDetails, updateCarAuction, deleteImage, setImageAsPrimary } from '../api/auction';
import { useAuth } from '../context/AuthContext';
import AuctionForm from './AuctionForm.jsx';
import Loader from '../components/Loader';

// Функция для форматирования даты в формат, который принимает input type="datetime-local"
const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const EditAuction = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [carData, setCarData] = useState(null);
    
    useEffect(() => {
        const fetchAuctionData = async () => {
            try {
                setLoading(true);
                const data = await getCarDetails(id);
                
                // Проверяем, является ли текущий пользователь продавцом
                if (data.seller.id !== user?.id) {
                    setError('У вас нет прав на редактирование этого аукциона');
                    return;
                }
                
                // Проверяем, можно ли редактировать аукцион
                if (data.status !== 'pending') {
                    setError('Редактировать можно только аукционы в статусе "Ожидает начала"');
                    return;
                }
                
                // Преобразуем данные для формы
                const initialData = {
                    brand: data.brand || '',
                    model: data.model || '',
                    year: data.year || new Date().getFullYear(),
                    mileage: data.mileage || '',
                    description: data.description || '',
                    starting_price: data.starting_price || '',
                    min_bid_increment: data.min_bid_increment || '100',
                    start_time: data.start_time ? formatDateForInput(data.start_time) : '',
                    end_time: data.end_time ? formatDateForInput(data.end_time) : '',
                    image: null,
                    image_url: data.image_url || null,
                    images: []
                };
                
                // Добавляем существующие изображения, если они есть
                if (data.images && Array.isArray(data.images)) {
                    initialData.images = data.images;
                }
                
                setCarData(initialData);
            } catch (err) {
                console.error('Ошибка при загрузке данных аукциона:', err);
                setError('Не удалось загрузить данные аукциона. Пожалуйста, попробуйте ещё раз.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchAuctionData();
    }, [id, user]);
    
    // Обработчик для удаления существующего изображения
    const handleRemoveImage = async (imageId) => {
        try {
            setError(null);
            
            // Вызываем API для удаления изображения
            await deleteImage(imageId);
            
            // Обновляем данные аукциона после удаления изображения
            const updatedData = await getCarDetails(id);
            
            // Обновляем данные в состоянии
            const updatedFormData = {
                ...carData,
                images: updatedData.images || []
            };
            
            setCarData(updatedFormData);
            
        } catch (err) {
            console.error('Error deleting image:', err);
            setError(
                err.message || 
                'Произошла ошибка при удалении изображения'
            );
        }
    };
    
    // Обработчик для установки изображения в качестве основного
    const handleSetPrimary = async (imageId) => {
        try {
            setError(null);
            
            // Вызываем API для установки основного изображения
            await setImageAsPrimary(imageId);
            
            // Обновляем данные аукциона после изменения
            const updatedData = await getCarDetails(id);
            
            // Обновляем данные в состоянии
            const updatedFormData = {
                ...carData,
                images: updatedData.images || []
            };
            
            setCarData(updatedFormData);
            
        } catch (err) {
            console.error('Error setting primary image:', err);
            setError(
                err.message || 
                'Произошла ошибка при установке основного изображения'
            );
        }
    };
    
    const handleSubmit = async (formData) => {
        try {
            setSubmitting(true);
            setError(null);
            
            // Обновляем аукцион
            await updateCarAuction(id, formData);
            
            // В случае успеха, перенаправляем на страницу успеха
            navigate('/success', { 
                state: { 
                    message: 'Аукцион успешно обновлен!',
                    backPath: `/auction/${id}`,
                    backText: 'Вернуться к аукциону' 
                } 
            });
        } catch (err) {
            console.error('Error updating auction:', err);
            setError(
                err.message || 
                'Произошла ошибка при обновлении аукциона'
            );
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) {
        return <Loader size="large" text="Загрузка данных аукциона..." />;
    }
    
    if (error) {
        return (
            <div className="error-container">
                <h2>Ошибка</h2>
                <p>{error}</p>
                <button 
                    className="cancel-button" 
                    onClick={() => navigate('/profile')}
                >
                    Вернуться в профиль
                </button>
            </div>
        );
    }
    
    return (
        <div className="auctions-page">
            <div className="page-header">
                <h1>РЕДАКТИРОВАТЬ АУКЦИОН</h1>
                <p>Измените информацию о вашем автомобиле, размещенном на аукционе</p>
            </div>
            
            {error && (
                <div className="error-message general-error">
                    <i className="fas fa-exclamation-triangle"></i> {error}
                </div>
            )}
            
            <div className="auction-form-container">
                {carData && (
                    <AuctionForm 
                        onSubmit={handleSubmit}
                        loading={submitting}
                        initialData={carData}
                        isEdit={true}
                        onRemoveImage={handleRemoveImage}
                        onSetPrimaryImage={handleSetPrimary}
                    />
                )}
            </div>
        </div>
    );
};

export default EditAuction;