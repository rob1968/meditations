import React from 'react';
// CSS styles are now in the global app.css

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  size = 'medium',
  className = '',
  ...props 
}) => {
  return (
    <button
      className={`button button-${variant} button-${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;