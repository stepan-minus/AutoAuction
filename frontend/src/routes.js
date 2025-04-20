// Route configuration
const routes = {
  // Public routes
  home: '/',
  login: '/login',
  register: '/register',
  auctionDetail: '/auction/:id',
  sellerProfile: '/seller/:id',
  success: '/success',
  
  // Protected routes
  profile: '/profile',
  createAuction: '/create-auction',
  
  // Chat routes
  chat: '/chat',
  conversations: '/conversations',
  messages: '/messages/:conversationId',
  
  // Helper function to get a route with params
  getRoute: (route, params = {}) => {
    let path = routes[route];
    
    if (!path) return '/';
    
    // Replace params in the route
    Object.keys(params).forEach(key => {
      path = path.replace(`:${key}`, params[key]);
    });
    
    return path;
  }
};

export default routes;
