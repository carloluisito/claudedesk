export type SessionStatus = 'ready' | 'initializing' | 'error' | 'warning' | 'idle';

interface SessionStatusIndicatorProps {
  status: SessionStatus;
  onClick?: () => void;
  size?: number;
}

export function SessionStatusIndicator({
  status,
  onClick,
  size = 8
}: SessionStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'ready':
        return '#9ece6a'; // Green
      case 'initializing':
        return '#ff9e64'; // Orange
      case 'error':
        return '#f7768e'; // Red
      case 'warning':
        return '#e0af68'; // Yellow
      case 'idle':
        return '#565f89'; // Gray
      default:
        return '#565f89';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'ready':
        return 'Claude Ready';
      case 'initializing':
        return 'Initializing...';
      case 'error':
        return 'Connection Error';
      case 'warning':
        return 'Budget Warning';
      case 'idle':
        return 'Idle';
      default:
        return 'Unknown';
    }
  };

  const isPulsing = status === 'initializing';

  return (
    <button
      className="status-indicator-btn"
      onClick={onClick}
      title={getStatusLabel()}
      aria-label={getStatusLabel()}
    >
      <div
        className={`status-indicator ${isPulsing ? 'pulsing' : ''}`}
        style={{
          width: size,
          height: size,
          backgroundColor: getStatusColor(),
        }}
      />

      <style>{`
        .status-indicator-btn {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          padding: 0;
          cursor: ${onClick ? 'pointer' : 'default'};
          opacity: ${onClick ? '0.8' : '1'};
          transition: opacity 0.2s ease;
        }

        .status-indicator-btn:hover {
          opacity: 1;
        }

        .status-indicator {
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .status-indicator.pulsing {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>
    </button>
  );
}
