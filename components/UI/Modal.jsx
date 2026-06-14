'use client';
import { useRef } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = '' }) {
  if (!open) return null;

  const mouseDownTarget = useRef(null);

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { mouseDownTarget.current = e.target; }}
      onMouseUp={e => {
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
          onClose();
        }
        mouseDownTarget.current = null;
      }}
    >
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
