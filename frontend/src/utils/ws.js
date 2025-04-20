import { useState, useEffect, useRef } from 'react';

/**
 * Helper function to construct a proper WebSocket URL based on the path
 * @param {string} path - The WebSocket path to connect to
 * @returns {string} The constructed WebSocket URL
 */
export const constructWebSocketUrl = (path) => {
  // Если путь не указан или null, возвращаем null
  if (!path) {
    return null;
  }
  
  // Get the host and protocol
  const host = window.location.host;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Choose the appropriate WebSocket path based on the input path
  let wsPath;
  
  if (path === 'auctions') {
    // Path for the auctions list
    wsPath = 'ws/auctions/';
  } else if (path.startsWith('auction/')) {
    // Path for a specific auction
    const auctionId = path.replace('auction/', '');
    wsPath = `ws/auction/${auctionId}/`;
  } else if (path.startsWith('chat/')) {
    // Path for a specific chat conversation
    const chatId = path.replace('chat/', '');
    wsPath = `ws/chat/${chatId}/`;
  } else if (/^\d+$/.test(path)) {
    // If the path is just a number, assume it's a chat ID
    wsPath = `ws/chat/${path}/`;
  } else {
    // Default fallback - just use the path as is with ws/ prefix
    wsPath = `ws/${path}/`;
  }
  
  // Добавляем JWT токен в URL для аутентификации через WebSocket
  const token = localStorage.getItem('accessToken');
  const wsUrl = `${protocol}//${host}/${wsPath}`;
  
  if (token) {
    // Добавляем токен как параметр запроса
    return `${wsUrl}?token=${token}`;
  }
  
  return wsUrl;
};

export const useWebSocket = (path, onMessage, isEnabled = true) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Если путь не указан или соединение отключено, пропускаем
    if (!path || !isEnabled) {
      return () => {};
    }
    
    // Construct WebSocket URL using our helper function
    const wsUrl = constructWebSocketUrl(path);
    
    // Если URL не удалось создать, пропускаем
    if (!wsUrl) {
      console.log('Cannot create WebSocket URL, path is invalid or null');
      return () => {};
    }

    console.log(`Connecting to WebSocket: ${wsUrl}`);

    try {
      // Create WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      // Connection opened
      socket.addEventListener('open', (event) => {
        console.log('WebSocket connected:', path);
        setConnected(true);
        setError(null);
      });

      // Listen for messages
      socket.addEventListener('message', (event) => {
        if (onMessage && typeof onMessage === 'function') {
          try {
            onMessage(event.data);
          } catch (err) {
            console.error('Error processing WebSocket message:', err);
          }
        }
      });

      // Connection closed
      socket.addEventListener('close', (event) => {
        console.log('WebSocket disconnected:', path);
        setConnected(false);

        // Only set error if it wasn't a normal closure
        if (event.code !== 1000) {
          setError(`Connection closed (${event.code}): ${event.reason}`);
        }
      });

      // Connection error
      socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      });

      // Clean up on unmount
      return () => {
        console.log('Cleaning up WebSocket connection');
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
        socketRef.current = null;
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError(`Failed to create WebSocket: ${err.message}`);
      return () => {};
    }
  }, [path, onMessage]);

  // Method to send messages
  const sendMessage = (data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(data));
        return true;
      } catch (err) {
        console.error('Error sending WebSocket message:', err);
        return false;
      }
    }
    return false;
  };

  return { connected, error, sendMessage };
};

/**
 * Connect to a WebSocket without using a hook
 * @param {string} path - The WebSocket path to connect to
 * @param {function} onMessage - Function to handle incoming messages
 * @param {function} onOpen - Function to handle connection open
 * @param {function} onClose - Function to handle connection close
 * @param {function} onError - Function to handle connection error
 * @returns {WebSocket} WebSocket instance
 */
export const connectWebSocket = (path, onMessage, onOpen, onClose, onError) => {
  // Если путь не указан, выходим
  if (!path) {
    console.log('Cannot connect WebSocket: path is null or undefined');
    if (onError) onError(new Error('Invalid WebSocket path'));
    return null;
  }
  
  // Construct WebSocket URL using our helper function
  const wsUrl = constructWebSocketUrl(path);
  
  // Если URL не удалось создать, выходим
  if (!wsUrl) {
    console.log('Cannot create WebSocket URL: Invalid path');
    if (onError) onError(new Error('Invalid WebSocket path'));
    return null;
  }

  console.log(`Connecting to WebSocket (direct): ${wsUrl}`);

  try {
    const socket = new WebSocket(wsUrl);

    if (onOpen) socket.addEventListener('open', onOpen);
    if (onMessage) {
      socket.addEventListener('message', (event) => {
        try {
          onMessage(event.data);
        } catch (err) {
          console.error('Error in WebSocket message handler:', err);
        }
      });
    }
    if (onClose) socket.addEventListener('close', onClose);
    if (onError) socket.addEventListener('error', onError);

    return socket;
  } catch (err) {
    console.error('Error creating direct WebSocket connection:', err);
    if (onError) onError(err);
    return null;
  }
};