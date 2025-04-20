import axios from 'axios';

// Create axios instance with CSRF token support and authorization
const api = axios.create({
    baseURL: '/api',
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
    withCredentials: true
});

// Add auth token to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Request interceptor to handle errors
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Redirect to login page if unauthorized
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

export const createAuction = async (auctionData) => {
    const response = await api.post('/auction/cars/', auctionData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
    });
    return response.data;
};

export const placeBid = async (auctionId, amount) => {
    const response = await api.post(
        `/auction/cars/${auctionId}/place_bid/`,
        { amount }
    );
    return response.data;
};

export const getAuction = async (auctionId) => {
    const response = await api.get(`/auction/cars/${auctionId}/`);
    return response.data;
};

export const getAuctions = async () => {
    const response = await api.get('/auction/cars/');
    return response.data;
};