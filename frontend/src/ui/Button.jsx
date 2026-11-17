import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';

import { classNames } from '../utils.js';
import { getIconProps } from '../icons.js';


/* =========================================================
   BUTTON
========================================================= */

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    outline: 'btn-outline',
  };

  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={classNames(
        'btn',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          {...getIconProps('sm')}
          className="button-spinner"
        />
      ) : (
        leftIcon
      )}

      {children}

      {!loading && rightIcon}
    </button>
  );
});


/* =========================================================
   ICON BUTTON
========================================================= */

export const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    label,
    size = 'md',
    variant = 'ghost',
    className = '',
    disabled = false,
    ...props
  },
  ref
) {
  const sizes = {
    sm: 'icon-btn-sm',
    md: 'icon-btn-md',
    lg: 'icon-btn-lg',
  };

  const variants = {
    ghost: 'icon-btn-ghost',
    secondary: 'icon-btn-secondary',
    primary: 'icon-btn-primary',
    danger: 'icon-btn-danger',
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={classNames(
        'icon-btn',
        sizes[size] || sizes.md,
        variants[variant] || variants.ghost,
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon
          {...getIconProps(size)}
        />
      )}
    </button>
  );
});


/* =========================================================
   BADGE
========================================================= */

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variants = {
    default: 'badge-default',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    neutral: 'badge-neutral',
  };

  const sizes = {
    sm: 'badge-sm',
    md: 'badge-md',
  };

  return (
    <span
      className={classNames(
        'badge',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
    >
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export default Button;


