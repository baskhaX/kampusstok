// toast.js - Toast Bildirim Bileşeni

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 4000) {
  const cont = getContainer();

  // Aynı mesajdan zaten varsa eskisini hemen kaldır (üst üste yığılmayı önle)
  const existingSame = Array.from(cont.querySelectorAll('.toast')).find(t => t.textContent.includes(message));
  if (existingSame) {
    existingSame.remove();
  }

  // Ekranda en fazla 3 toast göster, fazlasını baştan temizle
  const currentToasts = cont.querySelectorAll('.toast');
  if (currentToasts.length >= 3) {
    currentToasts[0].remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 500;">${message}</span>
    </div>
    <button style="color: inherit; opacity: 0.7; font-size: 16px;">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 200);
  };

  closeBtn.addEventListener('click', removeToast);
  setTimeout(removeToast, duration);

  cont.appendChild(toast);
}

export const toast = {
  success: (msg, dur) => showToast(msg, 'success', dur),
  error: (msg, dur) => showToast(msg, 'error', dur),
  info: (msg, dur) => showToast(msg, 'info', dur)
};

export default toast;
