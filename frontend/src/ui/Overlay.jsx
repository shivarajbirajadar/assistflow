import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import {
  X,
  ChevronDown,
} from 'lucide-react';

import { classNames } from '../utils.js';
import { getIconProps } from '../icons.js';


/* =========================================================
   COMMON OVERLAY HELPERS
========================================================= */

function useEscapeKey(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, enabled]);
}


function useBodyScrollLock(open) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}


function Portal({ children }) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}


/* =========================================================
   1. MODAL
========================================================= */

export function Modal({
  open = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
}) {
  const modalRef = useRef(null);

  useEscapeKey(onClose, open);
  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      modalRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl',
  };

  return (
    <Portal>
      <div
        className="overlay-backdrop"
        onMouseDown={(event) => {
          if (
            closeOnBackdrop &&
            event.target === event.currentTarget
          ) {
            onClose?.();
          }
        }}
      >
        <section
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          tabIndex={-1}
          className={classNames(
            'modal',
            sizes[size] || sizes.md,
            className
          )}
        >
          {(title || showCloseButton) && (
            <header className="modal-header">
              <div>
                {title && (
                  <h2 id="modal-title" className="modal-title">
                    {title}
                  </h2>
                )}

                {description && (
                  <p className="modal-description">
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  className="overlay-close"
                  aria-label="Close dialog"
                  onClick={onClose}
                >
                  <X {...getIconProps('md')} />
                </button>
              )}
            </header>
          )}

          <div className="modal-body">
            {children}
          </div>

          {footer && (
            <footer className="modal-footer">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </Portal>
  );
}


/* =========================================================
   2. BOTTOM SHEET
========================================================= */

export function BottomSheet({
  open = false,
  onClose,
  title,
  children,
  footer,
  className = '',
  closeOnBackdrop = true,
}) {
  useEscapeKey(onClose, open);
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <Portal>
      <div
        className="overlay-backdrop bottom-sheet-backdrop"
        onMouseDown={(event) => {
          if (
            closeOnBackdrop &&
            event.target === event.currentTarget
          ) {
            onClose?.();
          }
        }}
      >
        <section
          className={classNames(
            'bottom-sheet',
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Bottom sheet'}
        >
          <div className="bottom-sheet-handle" />

          <header className="bottom-sheet-header">
            {title && (
              <h2 className="modal-title">
                {title}
              </h2>
            )}

            <button
              type="button"
              className="overlay-close"
              aria-label="Close panel"
              onClick={onClose}
            >
              <X {...getIconProps('md')} />
            </button>
          </header>

          <div className="bottom-sheet-body">
            {children}
          </div>

          {footer && (
            <footer className="bottom-sheet-footer">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </Portal>
  );
}


/* =========================================================
   3. DRAWER
========================================================= */

export function Drawer({
  open = false,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  size = 'md',
  className = '',
  closeOnBackdrop = true,
}) {
  useEscapeKey(onClose, open);
  useBodyScrollLock(open);

  if (!open) return null;

  const sizes = {
    sm: 'drawer-sm',
    md: 'drawer-md',
    lg: 'drawer-lg',
  };

  return (
    <Portal>
      <div
        className="overlay-backdrop drawer-backdrop"
        onMouseDown={(event) => {
          if (
            closeOnBackdrop &&
            event.target === event.currentTarget
          ) {
            onClose?.();
          }
        }}
      >
        <section
          className={classNames(
            'drawer',
            `drawer-${position}`,
            sizes[size] || sizes.md,
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Side panel'}
        >
          <header className="drawer-header">
            <div>
              {title && (
                <h2 className="modal-title">
                  {title}
                </h2>
              )}

              {description && (
                <p className="modal-description">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              className="overlay-close"
              aria-label="Close drawer"
              onClick={onClose}
            >
              <X {...getIconProps('md')} />
            </button>
          </header>

          <div className="drawer-body">
            {children}
          </div>

          {footer && (
            <footer className="drawer-footer">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </Portal>
  );
}


/* =========================================================
   4. TOOLTIP
========================================================= */

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);

  if (disabled || !content) {
    return children;
  }

  return (
    <span
      className={classNames(
        'tooltip-wrapper',
        className
      )}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      {visible && (
        <span
          role="tooltip"
          className={classNames(
            'tooltip-content',
            `tooltip-${position}`
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}


/* =========================================================
   5. MENU
========================================================= */

export function Menu({
  trigger,
  items = [],
  position = 'bottom-right',
  className = '',
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSelect = (item) => {
    if (item.disabled || item.divider) return;

    item.onClick?.();
    onSelect?.(item);

    setOpen(false);
  };

  return (
    <div
      ref={menuRef}
      className={classNames(
        'menu-wrapper',
        className
      )}
    >
      <div
        className="menu-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        {trigger || (
          <button
            type="button"
            className="menu-default-trigger"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <ChevronDown {...getIconProps('md')} />
          </button>
        )}
      </div>

      {open && (
        <div
          className={classNames(
            'menu-dropdown',
            `menu-${position}`
          )}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="menu-divider"
                  role="separator"
                />
              );
            }

            const Icon = item.icon;

            return (
              <button
                key={item.id || index}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={classNames(
                  'menu-item',
                  item.danger && 'menu-item-danger',
                  item.disabled && 'menu-item-disabled'
                )}
                onClick={() => handleSelect(item)}
              >
                {Icon && (
                  <Icon {...getIconProps('sm')} />
                )}

                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}