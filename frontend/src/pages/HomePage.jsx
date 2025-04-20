import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCars, getFilteredCars } from '../api/auction';
import AuctionCard from '../components/AuctionCard';
import Loader from '../components/Loader';
import { useWebSocket } from '../utils/ws';

const HomePage = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    min_price: '',
    max_price: '',
    sort: 'created_desc',
    status: 'active'
  });
  
  // Load cars
  const loadCars = async (pageNum = 1, resetList = true) => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      // Check if any filters are applied
      const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === 'status') {
          return value !== 'active'; // Default is active, so only count if different
        }
        return value !== '';
      });
      
      if (hasActiveFilters) {
        // Prepare filter params
        const filterParams = { ...filters };
        
        // Remove empty filters
        Object.keys(filterParams).forEach(key => {
          if (filterParams[key] === '' || 
              (Array.isArray(filterParams[key]) && filterParams[key].length === 0)) {
            delete filterParams[key];
          }
        });
        
        // Use filtered endpoint
        response = await getFilteredCars(filterParams, pageNum);
      } else {
        // Use regular endpoint
        response = await getCars(pageNum);
      }
      
      const newCars = response.results || [];
      
      // Update cars list
      setCars(prevCars => resetList ? newCars : [...prevCars, ...newCars]);
      
      // Check if there are more pages
      setHasMore(!!response.next);
      
      // Update page number
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading cars:', err);
      setError('Не удалось загрузить аукционы. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load cars on mount and when filters change
  useEffect(() => {
    loadCars(1, true);
  }, [filters]);
  
  // Handle WebSocket updates
  const handleWsMessage = (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle bid update
      if (data.car_id) {
        setCars(prevCars => 
          prevCars.map(car => 
            car.id === data.car_id 
              ? { ...car, current_price: data.current_price }
              : car
          )
        );
      }
      
      // Handle auction status update
      if (data.type === 'auction_status_update') {
        setCars(prevCars => 
          prevCars.map(car => 
            car.id === data.car_id 
              ? { ...car, status: data.status }
              : car
          )
        );
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  };
  
  // Connect to WebSocket for real-time updates
  useWebSocket('auctions', handleWsMessage);
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle checkbox for multi-select filters
      setFilters(prev => {
        const currentValues = [...prev[name]];
        
        if (checked) {
          // Add to array if not present
          if (!currentValues.includes(value)) {
            currentValues.push(value);
          }
        } else {
          // Remove from array
          const index = currentValues.indexOf(value);
          if (index !== -1) {
            currentValues.splice(index, 1);
          }
        }
        
        return { ...prev, [name]: currentValues };
      });
    } else {
      // Handle text inputs and selects
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      min_price: '',
      max_price: '',
      sort: 'created_desc',
      status: 'active'
    });
  };
  
  // Load more cars when scrolling
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadCars(page + 1, false);
    }
  };
  
  return (
    <div className="home-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Bringing <span>Simplicity</span><br />In The Automotive Market</h1>
          <p>Найдите автомобиль своей мечты или продайте свой автомобиль по самой высокой цене через нашу современную платформу аукционов</p>
        </div>
      </div>
      
      <div className="container-fluid">
        <div className="section">
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon">
                <i className="fas fa-search"></i>
              </div>
              <h3 className="info-card-title">Легкий поиск</h3>
              <p className="info-card-text">Используйте наши фильтры для быстрого поиска подходящих автомобилей по различным параметрам</p>
            </div>
            
            <div className="info-card">
              <div className="info-card-icon">
                <i className="fas fa-clock"></i>
              </div>
              <h3 className="info-card-title">Аукционы в реальном времени</h3>
              <p className="info-card-text">Участвуйте в торгах с обновлениями в реальном времени и получайте уведомления о важных событиях</p>
            </div>
            
            <div className="info-card">
              <div className="info-card-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3 className="info-card-title">Безопасные сделки</h3>
              <p className="info-card-text">Наша платформа обеспечивает безопасность всех сделок и верификацию участников торгов</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container-fluid">
        <div className="filter-container">
          <h2>Поиск и фильтрация</h2>
          
          <div className="filter-form">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="search">Поиск</label>
                <input
                  type="text"
                  id="search"
                  name="search"
                  placeholder="Поиск по марке, модели или описанию"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="status">Статус</label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="active">Активные</option>
                  <option value="completed">Завершенные</option>
                  <option value="all">Все</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="sort">Сортировка</label>
                <select
                  id="sort"
                  name="sort"
                  value={filters.sort}
                  onChange={handleFilterChange}
                >
                  <option value="created_desc">Сначала новые</option>
                  <option value="price_asc">Цена: по возрастанию</option>
                  <option value="price_desc">Цена: по убыванию</option>
                </select>
              </div>
            </div>
            
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="min_price">Мин. цена</label>
                <input
                  type="number"
                  id="min_price"
                  name="min_price"
                  placeholder="Минимальная цена"
                  value={filters.min_price}
                  onChange={handleFilterChange}
                  min="0"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="max_price">Макс. цена</label>
                <input
                  type="number"
                  id="max_price"
                  name="max_price"
                  placeholder="Максимальная цена"
                  value={filters.max_price}
                  onChange={handleFilterChange}
                  min="0"
                />
              </div>
            </div>
            
            <div className="filter-buttons">
              <button onClick={handleResetFilters} className="reset-filters-button">
                Сбросить фильтры
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => loadCars(1, true)} className="retry-button">Попробовать снова</button>
          </div>
        )}
        
      </div>
      
      <div className="fullwidth-section">
        <div className="auctions-container">
          {cars.length > 0 ? (
            <div className="auction-grid">
              {cars.map(car => (
                <AuctionCard key={car.id} car={car} />
              ))}
            </div>
          ) : !loading ? (
            <div className="no-auctions">
              <h3>Аукционы не найдены</h3>
              <p>Попробуйте изменить параметры фильтров или вернитесь позже для просмотра новых лотов</p>
            </div>
          ) : null}
          
          {loading && <Loader />}
          
          {!loading && hasMore && (
            <div className="load-more">
              <button onClick={handleLoadMore} className="load-more-button">
                Загрузить еще
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
