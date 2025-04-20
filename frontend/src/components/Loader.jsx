import React from 'react';

const Loader = ({ size = 'medium', text = 'Loading...' }) => {
  const sizeClass = {
    small: 'loader-small',
    medium: 'loader-medium',
    large: 'loader-large'
  }[size] || 'loader-medium';

  return (
    <div className="loader-container">
      <div className={`loader ${sizeClass}`}>
        <i className="fas fa-circle-notch fa-spin"></i>
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;
