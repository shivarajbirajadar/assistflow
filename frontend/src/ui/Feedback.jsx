import {
  useEffect,
  useState,
} from 'react';

import {
  LoaderCircle,
  Inbox,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Undo2,
  X,
} from 'lucide-react';

import { classNames } from '../utils.js';
import { getIconProps } from '../icons.js';

import { Button, IconButton } from './Button.jsx';


/* =========================================================
   1. SPINNER
========================================================= */

export function Spinner({
  size = 'md',
  label = 'Loading...',
  className = '',
}) {
  const sizes = {
    sm: 16,
    md: 22,
    lg: 30,
    xl: 40,
  };

  return (
    <span
      className={classNames(
        'spinner-wrapper',
        className
      )}
      role="status"
    >
      <LoaderCircle
        size={sizes[size] || sizes.md}
        strokeWidth={2}
        className="spinner-icon"
        aria-hidden="true"
      />

      {label && (
        <span className="spinner-label">
          {label}
        </span>
      )}
    </span>
  );
}


/* =========================================================
   2. SKELETON
========================================================= */

export function Skeleton({
  width = '100%',
  height = 16,
  variant = 'rect',
  className = '',
  count = 1,
}) {
  const variants = {
    rect: 'skeleton-rect',
    circle: 'skeleton-circle',
    text: 'skeleton-text',
  };

  return (
    <div
      className="skeleton-group"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className={classNames(
            'skeleton',
            variants[variant] || variants.rect,
            className
          )}
          style={{
            width,
            height:
              variant === 'circle'
                ? width
                : height,
          }}
        />
      ))}
    </div>
  );
}


/* =========================================================
   3. EMPTY STATE
========================================================= */

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'There is no data to display.',
  action,
  actionLabel = 'Refresh',
  onAction,
  className = '',
}) {
  return (
    <div
      className={classNames(
        'empty-state',
        className
      )}
    >
      <div className="empty-state-icon">
        <Icon {...getIconProps('xl')} />
      </div>

      <h3 className="empty-state-title">
        {title}
      </h3>

      {description && (
        <p className="empty-state-description">
          {description}
        </p>
      )}

      {action || (
        onAction && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw {...getIconProps('sm')} />}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}


/* =========================================================
   4. ERROR STATE
========================================================= */

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this information. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) {
  return (
    <div
      className={classNames(
        'error-state',
        className
      )}
      role="alert"
    >
      <div className="error-state-icon">
        <AlertCircle {...getIconProps('xl')} />
      </div>

      <h3 className="error-state-title">
        {title}
      </h3>

      <p className="error-state-description">
        {description}
      </p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw {...getIconProps('sm')} />}
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}


/* =========================================================
   5. TOAST
========================================================= */

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    className: 'toast-success',
  },

  error: {
    icon: AlertCircle,
    className: 'toast-error',
  },

  warning: {
    icon: AlertTriangle,
    className: 'toast-warning',
  },

  info: {
    icon: Info,
    className: 'toast-info',
  },
};

export function Toast({
  message,
  title,
  type = 'info',
  duration = 4000,
  onClose,
  action,
  className = '',
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!duration || duration <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible || !message) {
    return null;
  }

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={classNames(
        'toast',
        config.className,
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon
        {...getIconProps('md')}
        className="toast-icon"
      />

      <div className="toast-content">
        {title && (
          <p className="toast-title">
            {title}
          </p>
        )}

        <p className="toast-message">
          {message}
        </p>

        {action && (
          <div className="toast-action">
            {action}
          </div>
        )}
      </div>

      <IconButton
        icon={X}
        label="Dismiss notification"
        size="sm"
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
      />
    </div>
  );
}


/* =========================================================
   6. UNDO TOAST
========================================================= */

export function UndoToast({
  message = 'Action completed',
  duration = 5000,
  onUndo,
  onClose,
  className = '',
}) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    if (remaining <= 0) {
      onClose?.();
      return undefined;
    }

    const timer = setTimeout(() => {
      setRemaining((current) => current - 100);
    }, 100);

    return () => clearTimeout(timer);
  }, [remaining, onClose]);

  if (remaining <= 0) {
    return null;
  }

  return (
    <div
      className={classNames(
        'undo-toast',
        className
      )}
      role="status"
    >
      <div className="undo-toast-message">
        <CheckCircle {...getIconProps('md')} />
        <span>{message}</span>
      </div>

      <div className="undo-toast-actions">
        <button
          type="button"
          className="undo-toast-button"
          onClick={() => {
            onUndo?.();
            onClose?.();
          }}
        >
          <Undo2 {...getIconProps('sm')} />
          Undo
        </button>

        <IconButton
          icon={X}
          label="Dismiss"
          size="sm"
          onClick={onClose}
        />
      </div>
    </div>
  );
}