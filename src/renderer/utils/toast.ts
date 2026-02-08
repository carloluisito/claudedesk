/**
 * Simple toast notification utility
 */

export type ToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'info', duration = 3000): void {
  // Remove existing toast if any
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.className = 'toast-notification';
  toast.setAttribute('data-type', type);

  // Set colors based on type
  const colors = {
    success: '#9ece6a',
    error: '#f7768e',
    info: '#7aa2f7',
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1a1b26;
    color: #a9b1d6;
    padding: 12px 20px;
    border-radius: 8px;
    border-left: 4px solid ${colors[type]};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    z-index: 10000;
    animation: slideInUp 0.3s ease-out, fadeOut 0.3s ease-out ${duration - 300}ms forwards;
    max-width: 400px;
  `;

  toast.textContent = message;

  // Add to body
  document.body.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, duration);
}

// Add keyframes to document if not already added
if (!document.getElementById('toast-keyframes')) {
  const style = document.createElement('style');
  style.id = 'toast-keyframes';
  style.textContent = `
    @keyframes slideInUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
