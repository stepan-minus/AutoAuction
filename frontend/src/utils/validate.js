/**
 * Validate registration form data
 * @param {object} data - The form data to validate
 * @returns {object} Object containing any validation errors
 */
export const validateRegistration = (data) => {
  const errors = {};
  
  // Username validation
  if (!data.username) {
    errors.username = 'Username is required';
  } else if (data.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }
  
  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Email is invalid';
  }
  
  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  // Password confirmation
  if (!data.password2) {
    errors.password2 = 'Please confirm your password';
  } else if (data.password !== data.password2) {
    errors.password2 = 'Passwords do not match';
  }
  
  return errors;
};

/**
 * Validate login form data
 * @param {object} data - The form data to validate
 * @returns {object} Object containing any validation errors
 */
export const validateLogin = (data) => {
  const errors = {};
  
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Email is invalid';
  }
  
  if (!data.password) {
    errors.password = 'Password is required';
  }
  
  return errors;
};

/**
 * Validate profile form data
 * @param {object} data - The form data to validate
 * @returns {object} Object containing any validation errors
 */
export const validateProfileForm = (data) => {
  const errors = {};
  
  if (!data.username) {
    errors.username = 'Username is required';
  } else if (data.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }
  
  if (data.profile && data.profile.phone) {
    // Basic phone validation (can be adjusted based on requirements)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(data.profile.phone) && data.profile.phone.trim() !== '') {
      errors['profile.phone'] = 'Please enter a valid phone number';
    }
  }
  
  if (data.profile && data.profile.bio) {
    if (data.profile.bio.length > 500) {
      errors['profile.bio'] = 'Bio must be 500 characters or less';
    }
  }
  
  return errors;
};

/**
 * Validate password change form data
 * @param {object} data - The form data to validate
 * @returns {object} Object containing any validation errors
 */
export const validatePasswordForm = (data) => {
  const errors = {};
  
  if (!data.old_password) {
    errors.old_password = 'Current password is required';
  }
  
  if (!data.new_password) {
    errors.new_password = 'New password is required';
  } else if (data.new_password.length < 8) {
    errors.new_password = 'Password must be at least 8 characters';
  }
  
  if (!data.confirm_password) {
    errors.confirm_password = 'Please confirm your new password';
  } else if (data.new_password !== data.confirm_password) {
    errors.confirm_password = 'Passwords do not match';
  }
  
  return errors;
};

/**
 * Validate car auction form data
 * @param {object} data - The form data to validate
 * @returns {object} Object containing any validation errors
 */
export const validateCarForm = (data) => {
  const errors = {};
  
  if (!data.brand) {
    errors.brand = 'Brand is required';
  }
  
  if (!data.model) {
    errors.model = 'Model is required';
  }
  
  if (!data.year) {
    errors.year = 'Year is required';
  } else {
    const year = parseInt(data.year);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(year) || year < 1900 || year > currentYear + 1) {
      errors.year = `Year must be between 1900 and ${currentYear + 1}`;
    }
  }
  
  if (!data.mileage && data.mileage !== 0) {
    errors.mileage = 'Mileage is required';
  } else if (isNaN(data.mileage) || data.mileage < 0) {
    errors.mileage = 'Mileage must be a positive number';
  }
  
  if (!data.description) {
    errors.description = 'Description is required';
  } else if (data.description.length < 20) {
    errors.description = 'Description must be at least 20 characters';
  }
  
  if (!data.starting_price) {
    errors.starting_price = 'Starting price is required';
  } else if (isNaN(data.starting_price) || data.starting_price <= 0) {
    errors.starting_price = 'Starting price must be a positive number';
  }
  
  if (!data.min_bid_increment) {
    errors.min_bid_increment = 'Minimum bid increment is required';
  } else if (isNaN(data.min_bid_increment) || data.min_bid_increment <= 0) {
    errors.min_bid_increment = 'Minimum bid increment must be a positive number';
  }
  
  if (!data.end_time) {
    errors.end_time = 'End time is required';
  } else {
    const endTime = new Date(data.end_time);
    const now = new Date();
    
    if (isNaN(endTime)) {
      errors.end_time = 'Invalid date format';
    } else if (endTime <= now) {
      errors.end_time = 'End time must be in the future';
    }
  }
  
  return errors;
};

/**
 * Validate bid data
 * @param {object} data - The bid data to validate
 * @param {object} car - The car data
 * @returns {object} Object containing any validation errors
 */
export const validateBid = (amount, car) => {
  const errors = {};
  
  if (!amount) {
    errors.amount = 'Bid amount is required';
  } else {
    const bidAmount = parseFloat(amount);
    
    if (isNaN(bidAmount) || bidAmount <= 0) {
      errors.amount = 'Bid amount must be a positive number';
    } else if (bidAmount <= car.current_price) {
      errors.amount = `Bid amount must be greater than current price (${car.current_price})`;
    } else {
      const minIncrement = parseFloat(car.min_bid_increment);
      const minRequired = parseFloat(car.current_price) + minIncrement;
      
      if (bidAmount < minRequired) {
        errors.amount = `Bid amount must be at least ${minRequired} (current price + ${minIncrement})`;
      }
    }
  }
  
  return errors;
};
