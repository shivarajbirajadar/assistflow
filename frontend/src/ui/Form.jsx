import {
  cloneElement,
  forwardRef,
  isValidElement,
  useState,
} from 'react';

import {
  Search,
  X,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';

import { classNames } from '../utils.js';
import { getIconProps } from '../icons.js';

// Supports both JSX icons and icon components.
function renderIcon(Icon, className) {
  if (!Icon) return null;

  const iconProps = {
    ...getIconProps('sm'),
    className,
  };

  if (isValidElement(Icon)) {
    return cloneElement(Icon, {
      ...iconProps,
      ...Icon.props,
      className,
    });
  }

  return <Icon {...iconProps} />;
}

/* =========================================================
   FORM FIELD WRAPPER
========================================================= */

function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = '',
}) {
  return (
    <div className={classNames('form-field', className)}>
      {label && (
        <label className="form-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="form-required"> *</span>}
        </label>
      )}

      {children}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!error && hint && (
        <p className="form-hint">{hint}</p>
      )}
    </div>
  );
}

/* =========================================================
   INPUT
========================================================= */

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    required = false,
    leftIcon,
    rightIcon,
    className = '',
    wrapperClassName = '',
    id,
    type = 'text',
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  const inputId = id || props.name;

  const actualType =
    type === 'password' && showPassword
      ? 'text'
      : type;

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <div
        className={classNames(
          'form-control-wrapper',
          error && 'has-error',
          leftIcon && 'has-left-icon',
          (rightIcon || type === 'password') && 'has-right-icon'
        )}
      >
        {renderIcon(leftIcon, 'form-control-icon left')}

        <input
          ref={ref}
          id={inputId}
          type={actualType}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${inputId}-error`
              : hint
                ? `${inputId}-hint`
                : undefined
          }
          className={classNames('form-input', className)}
          {...props}
        />

        {type === 'password' ? (
          <button
            type="button"
            className="form-password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? (
              <EyeOff {...getIconProps('sm')} />
            ) : (
              <Eye {...getIconProps('sm')} />
            )}
          </button>
        ) : (
          renderIcon(rightIcon, 'form-control-icon right')
        )}
      </div>
    </FormField>
  );
});

/* =========================================================
   SELECT
========================================================= */

export const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    required = false,
    options = [],
    placeholder = 'Select an option',
    className = '',
    wrapperClassName = '',
    id,
    children,
    ...props
  },
  ref
) {
  const selectId = id || props.name;

  return (
    <FormField
      label={label}
      htmlFor={selectId}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <div
        className={classNames(
          'form-select-wrapper',
          error && 'has-error'
        )}
      >
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={Boolean(error)}
          className={classNames('form-select', className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {children ||
            options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
        </select>

        <ChevronDown
          {...getIconProps('sm')}
          className="form-select-icon"
          aria-hidden="true"
        />
      </div>
    </FormField>
  );
});

/* =========================================================
   TEXTAREA
========================================================= */

export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    required = false,
    className = '',
    wrapperClassName = '',
    id,
    rows = 4,
    ...props
  },
  ref
) {
  const textareaId = id || props.name;

  return (
    <FormField
      label={label}
      htmlFor={textareaId}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        className={classNames('form-textarea', className)}
        {...props}
      />
    </FormField>
  );
});

/* =========================================================
   SEARCH INPUT
========================================================= */

export const SearchInput = forwardRef(function SearchInput(
  {
    value,
    onChange,
    onClear,
    placeholder = 'Search...',
    className = '',
    wrapperClassName = '',
    ...props
  },
  ref
) {
  const hasValue = Boolean(value);

  const handleClear = () => {
    onChange?.({
      target: {
        value: '',
      },
    });

    onClear?.();
  };

  return (
    <div
      className={classNames(
        'search-input-wrapper',
        wrapperClassName
      )}
    >
      <Search
        {...getIconProps('sm')}
        className="search-input-icon"
        aria-hidden="true"
      />

      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={classNames('search-input', className)}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          className="search-input-clear"
          aria-label="Clear search"
          onClick={handleClear}
        >
          <X {...getIconProps('sm')} />
        </button>
      )}
    </div>
  );
});