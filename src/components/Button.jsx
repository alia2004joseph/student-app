import React from 'react';

/**
 * Reusable button used across the school management system.
 *
 * Props:
 *  - variant: 'primary' | 'accent' | 'outline' | 'danger' | 'ghost'
 *  - size: 'sm' | 'md' | 'lg'
 *  - icon: optional element rendered before the label
 *  - loading: shows a spinner and disables the button
 *  - fullWidth: stretches the button to its container
 *  - as: 'button' | 'submit' (maps to the native type attribute)
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  loading = false,
  fullWidth = false,
  disabled = false,
  as = 'button',
  onClick,
  ...rest
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={as === 'submit' ? 'submit' : 'button'}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}

export default Button;