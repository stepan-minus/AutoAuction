import React, { useState, useEffect } from 'react';
import { Form, Image } from 'react-bootstrap';

// Функция для установки времени с учетом часового пояса Новосибирска (GMT+7)
const getNovosibirskTime = (date = new Date()) => {
    const novosibirskOffset = 7 * 60; // GMT+7 в минутах
    const localDate = new Date(date);
    
    // Получаем текущее смещение в минутах относительно UTC
    const localOffset = localDate.getTimezoneOffset();
    
    // Вычисляем разницу между локальным часовым поясом и Новосибирском
    const offsetDiff = localOffset + novosibirskOffset;
    
    // Корректируем дату
    localDate.setMinutes(localDate.getMinutes() + offsetDiff);
    
    return localDate;
};

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

const AuctionForm = ({ onSubmit, loading, initialData, isEdit = false, onRemoveImage, onSetPrimaryImage }) => {
    // Устанавливаем значения по умолчанию для дат
    const nowInNovosibirsk = getNovosibirskTime();
    const defaultStartTime = new Date(nowInNovosibirsk);
    defaultStartTime.setHours(defaultStartTime.getHours() + 1); // Начало через 1 час по умолчанию
    
    const defaultEndTime = new Date(nowInNovosibirsk);
    defaultEndTime.setDate(defaultEndTime.getDate() + 3); // Окончание через 3 дня по умолчанию
    
    const [formData, setFormData] = useState({
        brand: initialData?.brand || '',
        model: initialData?.model || '',
        year: initialData?.year || new Date().getFullYear(),
        mileage: initialData?.mileage || '',
        description: initialData?.description || '',
        starting_price: initialData?.starting_price || '',
        min_bid_increment: initialData?.min_bid_increment || '100',

        end_time: initialData?.end_time || formatDateForInput(defaultEndTime),
        image: null,
        images: []
    });

    // Состояние для превью одиночного изображения (обратная совместимость)
    const [imagePreview, setImagePreview] = useState(initialData?.image_url || null);
    
    // Состояние для хранения превью множественных изображений
    const [imagesPreviews, setImagesPreviews] = useState([]);
    
    // Если есть существующие изображения у автомобиля
    const [existingImages, setExistingImages] = useState(initialData?.images || []);
    const [validationErrors, setValidationErrors] = useState({});
    
    // Добавляем информацию о часовом поясе для пользователя
    const [timezoneInfo] = useState(`Время указывается по часовому поясу: Новосибирск (GMT+7)`);
    

    const validateForm = () => {
        const errors = {};
        const nowInNovosibirsk = getNovosibirskTime(); // Текущее время в Новосибирске
        const endDate = new Date(formData.end_time);
        const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

        if (!formData.brand.trim()) {
            errors.brand = 'Марка автомобиля обязательна';
        }
        if (!formData.model.trim()) {
            errors.model = 'Модель автомобиля обязательна';
        }
        if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
            errors.year = 'Укажите корректный год выпуска';
        }
        if (!formData.mileage || formData.mileage < 0) {
            errors.mileage = 'Укажите корректный пробег';
        }
        if (!formData.description.trim()) {
            errors.description = 'Описание обязательно';
        }
        if (!formData.starting_price || formData.starting_price <= 0) {
            errors.starting_price = 'Начальная цена должна быть больше 0';
        }
        if (!formData.min_bid_increment || formData.min_bid_increment <= 0) {
            errors.min_bid_increment = 'Минимальная сумма ставки должна быть больше 0';
        }

        if (!formData.end_time) {
            errors.end_time = 'Дата окончания обязательна';
        } else if (endDate <= nowInNovosibirsk) {
            errors.end_time = 'Дата окончания должна быть в будущем';
        } else if (endDate - nowInNovosibirsk > maxDuration) {
            errors.end_time = 'Максимальная продолжительность аукциона - 30 дней';
        }
        return errors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length === 0) {
            const formDataToSend = new FormData();
            
            // Добавляем основные поля формы
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null) {
                    // Обработка специальных полей
                    if (key === 'mileage' || key === 'year') {
                        formDataToSend.append(key, parseInt(formData[key], 10));
                    } else if (key === 'starting_price' || key === 'min_bid_increment') {
                        formDataToSend.append(key, parseFloat(formData[key]));
                    } else if (key === 'image' && formData.image instanceof File) {
                        // Добавляем основное изображение
                        formDataToSend.append('image', formData.image);
                    } else if (key === 'images' && Array.isArray(formData.images)) {
                        // Добавляем множественные изображения
                        formData.images.forEach(image => {
                            if (image instanceof File) {
                                formDataToSend.append('images', image);
                            }
                        });
                    } else if (key !== 'images' && key !== 'image') {
                        // Добавляем остальные поля
                        formDataToSend.append(key, formData[key]);
                    }
                }
            });
            
            // Добавляем информацию о существующих изображениях для редактирования
            if (isEdit) {
                // Добавляем список существующих изображений, которые нужно сохранить
                existingImages.forEach(img => {
                    formDataToSend.append('existing_images', img.id);
                });
            }
            
            onSubmit(formDataToSend);
        } else {
            setValidationErrors(errors);
        }
    };

    // Обработчик для загрузки изображений
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'images') {
            if (files && files.length > 0) {
                // Ограничиваем количество фото до 10
                const maxFiles = 10;
                const totalNewFiles = Math.min(files.length, maxFiles - imagesPreviews.length - (formData.image ? 1 : 0));
                
                if (totalNewFiles > 0) {
                    const newImages = [...formData.images];
                    const newPreviews = [...imagesPreviews];
                    
                    // Если у нас еще нет основного изображения, устанавливаем первое как основное
                    if (!formData.image && !imagePreview) {
                        setFormData(prev => ({
                            ...prev,
                            image: files[0]
                        }));
                        setImagePreview(URL.createObjectURL(files[0]));
                        
                        // Добавляем остальные изображения в массив дополнительных
                        for (let i = 1; i < totalNewFiles; i++) {
                            newImages.push(files[i]);
                            newPreviews.push(URL.createObjectURL(files[i]));
                        }
                    } else {
                        // Добавляем все изображения в массив дополнительных
                        for (let i = 0; i < totalNewFiles; i++) {
                            newImages.push(files[i]);
                            newPreviews.push(URL.createObjectURL(files[i]));
                        }
                    }
                    
                    setFormData(prev => ({
                        ...prev,
                        images: newImages
                    }));
                    setImagesPreviews(newPreviews);
                }
                
                if (files.length > maxFiles) {
                    alert(`Вы можете загрузить максимум ${maxFiles} изображений. Первые ${maxFiles} были выбраны.`);
                }
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        // Clear validation error when field is modified
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };
    
    // Удаление загруженного изображения
    const handleRemoveImage = (index) => {
        const newImages = [...formData.images];
        const newPreviews = [...imagesPreviews];
        
        // Освобождаем URL для предотвращения утечек памяти
        URL.revokeObjectURL(newPreviews[index]);
        
        // Удаляем элемент из массивов
        newImages.splice(index, 1);
        newPreviews.splice(index, 1);
        
        setFormData(prev => ({
            ...prev,
            images: newImages
        }));
        setImagesPreviews(newPreviews);
    };
    
    // Удаление существующего изображения
    const handleRemoveExistingImage = (imageId) => {
        if (isEdit && imageId) {
            // Удаляем изображение из массива существующих
            setExistingImages(prev => prev.filter(img => img.id !== imageId));
            
            // Сообщаем родительскому компоненту об удалении изображения, если требуется
            if (onRemoveImage) {
                onRemoveImage(imageId);
            }
        }
    };
    


    return (
        <div className="auction-form-panel">
            <Form onSubmit={handleSubmit} className="auction-form">
                <div className="form-section">
                    <h3 className="auction-form-section-title">ДАННЫЕ АВТОМОБИЛЯ</h3>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <Form.Label>Марка</Form.Label>
                            <Form.Control
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                isInvalid={!!validationErrors.brand}
                                placeholder="Например: Toyota, BMW"
                                className="form-input"
                            />
                            {validationErrors.brand && (
                                <div className="error-message">{validationErrors.brand}</div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <Form.Label>Модель</Form.Label>
                            <Form.Control
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                isInvalid={!!validationErrors.model}
                                placeholder="Например: Camry, X5"
                                className="form-input"
                            />
                            {validationErrors.model && (
                                <div className="error-message">{validationErrors.model}</div>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <Form.Label>Год выпуска</Form.Label>
                            <Form.Control
                                type="number"
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                min="1900"
                                max={new Date().getFullYear() + 1}
                                isInvalid={!!validationErrors.year}
                                className="form-input"
                            />
                            {validationErrors.year && (
                                <div className="error-message">{validationErrors.year}</div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <Form.Label>Пробег (км)</Form.Label>
                            <Form.Control
                                type="number"
                                name="mileage"
                                value={formData.mileage}
                                onChange={handleChange}
                                min="0"
                                isInvalid={!!validationErrors.mileage}
                                placeholder="Пробег в километрах"
                                className="form-input"
                            />
                            {validationErrors.mileage && (
                                <div className="error-message">{validationErrors.mileage}</div>
                            )}
                        </div>
                    </div>

                    <div className="form-group description-group">
                        <Form.Label>Описание</Form.Label>
                        <Form.Control
                            as="textarea"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            isInvalid={!!validationErrors.description}
                            placeholder="Подробно опишите состояние, историю и особенности автомобиля"
                            className="form-input description-input"
                            style={{ minHeight: "100px" }}
                        />
                        {validationErrors.description && (
                            <div className="error-message">{validationErrors.description}</div>
                        )}
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="auction-form-section-title">ПАРАМЕТРЫ АУКЦИОНА</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <Form.Label>Начальная цена</Form.Label>
                            <Form.Control
                                type="number"
                                name="starting_price"
                                value={formData.starting_price}
                                onChange={handleChange}
                                min="0.01"
                                step="0.01"
                                isInvalid={!!validationErrors.starting_price}
                                className="form-input"
                                placeholder="Начальная ставка"
                            />
                            {validationErrors.starting_price && (
                                <div className="error-message">{validationErrors.starting_price}</div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <Form.Label>Минимальная сумма ставки</Form.Label>
                            <Form.Control
                                type="number"
                                name="min_bid_increment"
                                value={formData.min_bid_increment}
                                onChange={handleChange}
                                min="0.01"
                                step="0.01"
                                isInvalid={!!validationErrors.min_bid_increment}
                                className="form-input"
                                placeholder="Минимальная сумма ставки"
                            />
                            {validationErrors.min_bid_increment && (
                                <div className="error-message">{validationErrors.min_bid_increment}</div>
                            )}
                        </div>
                    </div>

                    <div className="timezone-info">
                        <i className="fas fa-clock"></i> {timezoneInfo}
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group full-width">
                            <Form.Label>Дата окончания</Form.Label>
                            <Form.Control
                                type="datetime-local"
                                name="end_time"
                                value={formData.end_time}
                                onChange={handleChange}
                                isInvalid={!!validationErrors.end_time}
                                className="form-input"
                            />
                            {validationErrors.end_time && (
                                <div className="error-message">{validationErrors.end_time}</div>
                            )}
                        </div>
                    </div>
                </div>


                
                <div className="form-section">
                    <h3 className="auction-form-section-title">ИЗОБРАЖЕНИЯ</h3>
                    
                    {/* Все изображения через одну кнопку */}
                    <div className="images-container">
                        <h4>ФОТОГРАФИИ АВТОМОБИЛЯ</h4>
                        <label className="image-upload-container">
                            <input
                                type="file"
                                name="images"
                                onChange={handleChange}
                                accept="image/*"
                                multiple
                                className="visually-hidden"
                                id="imagesUpload"
                                max="10"
                            />
                            
                            <div className={`image-upload-area ${imagePreview || imagesPreviews.length > 0 ? 'has-images' : ''}`} role="button" tabIndex="0">
                                {(imagePreview || imagesPreviews.length > 0) ? (
                                    <div className="uploaded-images-count">
                                        <span>{(imagePreview ? 1 : 0) + imagesPreviews.length} фото</span>
                                        <i className="fas fa-plus"></i>
                                    </div>
                                ) : (
                                    <div className="image-upload-placeholder">
                                        <i className="fas fa-camera fa-3x"></i>
                                        <p>ВЫБЕРИТЕ ДО 10 ФОТО</p>
                                        <span>Нажмите для загрузки</span>
                                    </div>
                                )}
                            </div>
                        </label>
                        
                        {/* Отображение всех загруженных изображений в сетке */}
                        {(imagePreview || imagesPreviews.length > 0) && (
                            <div className="images-preview-grid">
                                {/* Показываем основное изображение, если оно есть */}
                                {imagePreview && (
                                    <div className="image-preview-container">
                                        <Image src={imagePreview} className="image-preview" alt="Основное фото" />
                                        <button 
                                            type="button" 
                                            className="remove-image-btn"
                                            onClick={() => {
                                                URL.revokeObjectURL(imagePreview);
                                                setImagePreview(null);
                                                setFormData(prev => ({...prev, image: null}));
                                            }}
                                        >
                                            &times;
                                        </button>
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                bottom: '5px',
                                                right: '5px',
                                                backgroundColor: 'rgba(0, 177, 106, 0.7)',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '12px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Основное
                                        </div>
                                    </div>
                                )}
                                
                                {/* Показываем остальные изображения */}
                                {imagesPreviews.map((preview, index) => (
                                    <div key={`new-${index}`} className="image-preview-container">
                                        <Image src={preview} className="image-preview" alt={`Фото ${index + 1}`} />
                                        <button 
                                            type="button" 
                                            className="remove-image-btn"
                                            onClick={() => handleRemoveImage(index)}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Отображение сохраненных изображений для режима редактирования */}
                        {isEdit && existingImages.length > 0 && (
                            <div className="existing-images-container">
                                <h4>СОХРАНЕННЫЕ ИЗОБРАЖЕНИЯ</h4>
                                <div className="images-preview-grid">
                                    {existingImages.map((img) => (
                                        <div key={`existing-${img.id}`} className="image-preview-container">
                                            <Image src={img.image_url} className="image-preview" alt="Сохраненное фото" />
                                            <button 
                                                type="button" 
                                                className="remove-image-btn"
                                                onClick={() => handleRemoveExistingImage(img.id)}
                                            >
                                                &times;
                                            </button>
                                            
                                            {!img.is_primary && onSetPrimaryImage && (
                                                <button 
                                                    type="button" 
                                                    className="set-primary-btn" 
                                                    onClick={() => onSetPrimaryImage(img.id)}
                                                    title="Сделать основным"
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '5px',
                                                        right: '5px',
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(0, 122, 255, 0.7)',
                                                        color: 'white',
                                                        border: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ★
                                                </button>
                                            )}
                                            
                                            {img.is_primary && (
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '5px',
                                                        right: '5px',
                                                        backgroundColor: 'rgba(0, 177, 106, 0.7)',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Основное
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-buttons">
                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading 
                            ? (isEdit ? 'СОХРАНЕНИЕ...' : 'СОЗДАНИЕ...') 
                            : (isEdit ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'СОЗДАТЬ АУКЦИОН')}
                    </button>
                </div>
            </Form>
        </div>
    );
};

export default AuctionForm;