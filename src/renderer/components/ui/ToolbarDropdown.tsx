import { useState, useRef, useEffect, ReactNode } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: string | number;
  shortcut?: string;
  disabled?: boolean;
}

interface ToolbarDropdownProps {
  icon: ReactNode;
  label: string;
  items: DropdownItem[];
  title?: string;
}

export function ToolbarDropdown({ icon, label, items, title }: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className="toolbar-dropdown" ref={dropdownRef}>
      <button
        className={`toolbar-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={title || label}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <span className="trigger-icon">{icon}</span>
        <span className="trigger-label">{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`trigger-arrow ${isOpen ? 'open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="toolbar-dropdown-menu">
          {items.map((item) => (
            <button
              key={item.id}
              className={`dropdown-menu-item ${item.disabled ? 'disabled' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              <span className="menu-item-icon">{item.icon}</span>
              <span className="menu-item-label">{item.label}</span>
              {item.shortcut && (
                <span className="menu-item-shortcut">{item.shortcut}</span>
              )}
              {item.badge && (
                <span className="menu-item-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .toolbar-dropdown {
          position: relative;
          display: inline-block;
        }

        .toolbar-dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px;
          background: #24283b;
          border: 1px solid #3d4458;
          border-radius: 6px;
          color: #a9b1d6;
          font-size: 12px;
          font-weight: 500;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toolbar-dropdown-trigger:hover {
          background: #292e42;
          border-color: #7aa2f7;
          color: #7aa2f7;
        }

        .toolbar-dropdown-trigger.active {
          background: #292e42;
          border-color: #7aa2f7;
          color: #7aa2f7;
        }

        .trigger-icon {
          display: flex;
          align-items: center;
        }

        .trigger-label {
          font-weight: 500;
        }

        .trigger-arrow {
          transition: transform 0.2s ease;
        }

        .trigger-arrow.open {
          transform: rotate(180deg);
        }

        .toolbar-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 200px;
          background: #1a1b26;
          border: 1px solid #3d4458;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          overflow: hidden;
          animation: dropdown-slide-in 0.2s cubic-bezier(0, 0, 0.2, 1);
        }

        @keyframes dropdown-slide-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          background: transparent;
          border: none;
          border-bottom: 1px solid #292e42;
          color: #a9b1d6;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }

        .dropdown-menu-item:last-child {
          border-bottom: none;
        }

        .dropdown-menu-item:hover:not(.disabled) {
          background: #24283b;
          color: #e9e9ea;
        }

        .dropdown-menu-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .menu-item-icon {
          display: flex;
          align-items: center;
          color: #7aa2f7;
        }

        .menu-item-label {
          flex: 1;
        }

        .menu-item-shortcut {
          font-size: 10px;
          color: #565f89;
          opacity: 0.7;
          font-family: 'JetBrains Mono', monospace;
        }

        .menu-item-badge {
          padding: 2px 6px;
          background: #7aa2f7;
          color: #1a1b26;
          font-size: 10px;
          font-weight: 600;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
