import React, { useState, useEffect } from 'react';
import { formatTimeRemaining } from '../utils/formatDate';
import '../styles/components/timer.css';

const Timer = ({ endTime, timeRemaining: initialTimeRemaining, compact = false }) => {
  const [timeRemaining, setTimeRemaining] = useState(
    initialTimeRemaining || 
    Math.max(0, Math.floor((new Date(endTime) - new Date()) / 1000))
  );
  
  const [timerColor, setTimerColor] = useState('normal');
  
  useEffect(() => {
    // Update the timer color based on remaining time
    if (timeRemaining <= 300) { // 5 minutes
      setTimerColor('critical');
    } else if (timeRemaining <= 3600) { // 1 hour
      setTimerColor('warning');
    } else {
      setTimerColor('normal');
    }
    
    // Exit if timer already finished
    if (timeRemaining <= 0) {
      return;
    }
    
    // Set up interval to update remaining time
    const timerId = setInterval(() => {
      setTimeRemaining(prevTime => {
        const newTime = prevTime - 1;
        
        // Update color when thresholds are crossed
        if (newTime === 3600) { // 1 hour
          setTimerColor('warning');
        } else if (newTime === 300) { // 5 minutes
          setTimerColor('critical');
        }
        
        // Clear interval when timer reaches zero
        if (newTime <= 0) {
          clearInterval(timerId);
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(timerId);
  }, [endTime, timeRemaining]);
  
  // When initial time remaining changes (like from WebSocket updates)
  useEffect(() => {
    if (initialTimeRemaining !== undefined) {
      setTimeRemaining(initialTimeRemaining);
    }
  }, [initialTimeRemaining]);
  
  // Format the time for display
  const formattedTime = formatTimeRemaining(timeRemaining);
  
  return (
    <div className={`auction-timer timer-${timerColor} ${compact ? 'timer-compact' : ''}`}>
      <i className="fas fa-clock timer-icon"></i>
      <span className="timer-text">
        {timeRemaining <= 0 ? 'Аукцион завершен' : formattedTime}
      </span>
    </div>
  );
};

export default Timer;
