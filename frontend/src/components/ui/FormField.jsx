import React from 'react';
// CSS styles are now in the global app.css

const FormField = ({ 
  label, 
  children, 
  className = '',
  required = false,
  ...props 
}) => {
  return (
    <div className={`form-field ${className}`} {...props}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      {children}
    </div>
  );
};

export default FormField;