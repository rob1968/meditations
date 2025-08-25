import React from 'react';
// CSS styles are now in the global app.css

const Select = ({ 
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <div className="select-wrapper">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`select ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;