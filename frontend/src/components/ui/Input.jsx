import React from 'react';
// CSS styles are now in the global app.css

const Input = ({ 
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  rows,
  ...props 
}) => {
  const isTextarea = type === 'textarea' || rows;
  
  const Component = isTextarea ? 'textarea' : 'input';
  
  return (
    <Component
      type={isTextarea ? undefined : type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={`input ${className}`}
      {...props}
    />
  );
};

export default Input;