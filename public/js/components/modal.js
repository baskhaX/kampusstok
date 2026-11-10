// modal.js - Genel Modal Pencere Bileşeni

export function createModal({ title, contentHtml, content, footerHtml = '', maxWidth = '560px', closable = true }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const bodyContent = contentHtml || content || '';

  backdrop.innerHTML = `
    <div class="modal-content" style="max-width: ${maxWidth};">
      <div class="card-header">
        <h3>${title}</h3>
        ${closable ? '<button class="modal-close-btn" aria-label="Kapat" title="Kapat">&times;</button>' : ''}
      </div>
      <div class="card-body">
        ${bodyContent}
      </div>
      ${footerHtml ? `<div class="card-footer" style="display: flex; justify-content: flex-end; gap: 10px;">${footerHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(backdrop);

  // Açılış animasyonu
  requestAnimationFrame(() => {
    backdrop.classList.add('open');
  });

  const handleKeydown = (e) => {
    if (e.key === 'Escape') close();
  };

  const close = () => {
    window.removeEventListener('keydown', handleKeydown);
    backdrop.classList.remove('open');
    setTimeout(() => backdrop.remove(), 250);
  };

  if (closable) {
    window.addEventListener('keydown', handleKeydown);
    const closeBtn = backdrop.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }

  return {
    element: backdrop,
    open: () => backdrop.classList.add('open'),
    close
  };
}

// Onaylama Modalı (Apple Liquid Glass - Tarayıcı confirm() yerine geçer)
export function confirmModal({
  title = 'İşlem Onayı',
  message = '',
  description = '',
  confirmText = 'Evet, Devam Et',
  cancelText = 'Vazgeç',
  type = 'warning', // 'danger', 'warning', 'primary', 'info'
  icon = null
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.zIndex = '1100';

    let iconSymbol = icon;
    let iconBg = 'rgba(245, 158, 11, 0.12)';
    let iconColor = '#d97706';
    let btnClass = 'btn-primary';
    let btnStyle = '';

    if (type === 'danger') {
      iconSymbol = icon || '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      iconBg = 'rgba(239, 68, 68, 0.12)';
      iconColor = '#dc2626';
      btnClass = 'btn-danger';
      btnStyle = 'background: #dc2626; color: #fff; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);';
    } else if (type === 'warning') {
      iconSymbol = icon || '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      iconBg = 'rgba(245, 158, 11, 0.12)';
      iconColor = '#d97706';
      btnClass = 'btn-warning';
      btnStyle = 'background: #d97706; color: #fff; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);';
    } else if (type === 'primary') {
      iconSymbol = icon || '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
      iconBg = 'rgba(37, 99, 235, 0.12)';
      iconColor = '#2563eb';
      btnClass = 'btn-accent';
      btnStyle = 'background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);';
    } else {
      iconSymbol = icon || '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
      iconBg = 'rgba(100, 116, 139, 0.12)';
      iconColor = '#475569';
      btnClass = 'btn-primary';
      btnStyle = '';
    }

    backdrop.innerHTML = `
      <div class="modal-content" style="max-width: 480px; padding: 26px 28px; text-align: left;">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 48px; height: 48px; border-radius: 16px; background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
            ${iconSymbol}
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 17px; font-weight: 700; color: var(--color-foreground, #0f172a); margin: 0 0 6px 0;">
              ${title}
            </h3>
            <div style="font-size: 14px; color: #334155; line-height: 1.5; font-weight: 500;">
              ${message}
            </div>
            ${description ? `
              <div style="font-size: 12.5px; color: var(--color-muted-foreground, #64748b); margin-top: 8px; line-height: 1.45; background: rgba(0,0,0,0.02); padding: 8px 10px; border-radius: 8px;">
                ${description}
              </div>
            ` : ''}
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border, rgba(226, 232, 240, 0.8));">
          <button type="button" class="btn btn-outline btn-dialog-cancel" style="padding: 9px 18px; border-radius: 12px; font-size: 13.5px;">
            ${cancelText}
          </button>
          <button type="button" class="btn ${btnClass} btn-dialog-confirm" style="padding: 9px 20px; border-radius: 12px; font-size: 13.5px; font-weight: 700; ${btnStyle}">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    let isDone = false;
    const finish = (result) => {
      if (isDone) return;
      isDone = true;
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 250);
      window.removeEventListener('keydown', onKeyDown);
      resolve(result);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'Enter') finish(true);
    };
    window.addEventListener('keydown', onKeyDown);

    backdrop.querySelector('.btn-dialog-cancel').addEventListener('click', () => finish(false));
    backdrop.querySelector('.btn-dialog-confirm').addEventListener('click', () => finish(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish(false);
    });

    setTimeout(() => {
      backdrop.querySelector('.btn-dialog-confirm')?.focus();
    }, 50);
  });
}

// Bilgilendirme Modalı (Tarayıcı alert() yerine geçer)
export function alertModal({
  title = 'Bilgilendirme',
  message = '',
  description = '',
  buttonText = 'Tamam',
  type = 'info',
  icon = null
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.zIndex = '1100';

    let iconSymbol = icon || '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    let iconBg = 'rgba(37, 99, 235, 0.12)';
    let iconColor = '#2563eb';

    if (type === 'success') {
      iconSymbol = icon || '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      iconBg = 'rgba(22, 163, 74, 0.12)';
      iconColor = '#16a34a';
    } else if (type === 'error' || type === 'danger') {
      iconSymbol = icon || '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      iconBg = 'rgba(239, 68, 68, 0.12)';
      iconColor = '#dc2626';
    }

    backdrop.innerHTML = `
      <div class="modal-content" style="max-width: 460px; padding: 26px 28px; text-align: left;">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 48px; height: 48px; border-radius: 16px; background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">
            ${iconSymbol}
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 17px; font-weight: 700; color: var(--color-foreground, #0f172a); margin: 0 0 6px 0;">
              ${title}
            </h3>
            <div style="font-size: 14px; color: #334155; line-height: 1.5; font-weight: 500;">
              ${message}
            </div>
            ${description ? `
              <div style="font-size: 12.5px; color: var(--color-muted-foreground, #64748b); margin-top: 8px; line-height: 1.45;">
                ${description}
              </div>
            ` : ''}
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border, rgba(226, 232, 240, 0.8));">
          <button type="button" class="btn btn-primary btn-alert-ok" style="padding: 9px 24px; border-radius: 12px; font-size: 13.5px; font-weight: 700;">
            ${buttonText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));

    let isDone = false;
    const finish = () => {
      if (isDone) return;
      isDone = true;
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 250);
      window.removeEventListener('keydown', onKeyDown);
      resolve();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') finish();
    };
    window.addEventListener('keydown', onKeyDown);

    backdrop.querySelector('.btn-alert-ok').addEventListener('click', finish);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish();
    });

    setTimeout(() => {
      backdrop.querySelector('.btn-alert-ok')?.focus();
    }, 50);
  });
}

export default createModal;
