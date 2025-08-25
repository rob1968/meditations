import React from 'react';
// CSS styles are now in the global app.css

const Card = ({ 
  children, 
  className = '',
  variant = 'primary',
  ...props 
}) => {
  return (
    <div
      className={`card card-${variant} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;