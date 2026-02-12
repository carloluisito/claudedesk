interface HelpButtonProps {
  onClick: () => void;
  title?: string;
}

export function HelpButton({ onClick, title = 'Help & Shortcuts (Ctrl+/)' }: HelpButtonProps) {
  return (
    <button className="help-button" onClick={onClick} title={title} aria-label="Help">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <style>{`
        .help-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #24283b;
          border: 1px solid #3d4458;
          border-radius: 6px;
          color: #a9b1d6;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .help-button:hover {
          background: #292e42;
          border-color: #7aa2f7;
          color: #7aa2f7;
          transform: translateY(-1px);
        }

        .help-button:active {
          transform: translateY(0);
        }
      `}</style>
    </button>
  );
}
