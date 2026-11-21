import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionStore } from '../../stores/sessionStore';
import styles from './Toast.module.css';

export function Toast() {
  const toast = useSessionStore((s) => s.toast);
  const clearToast = useSessionStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 3400);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  return (
    <div className={styles.container} aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className={`${styles.toast} ${styles[toast.tone]}`}
            onClick={clearToast}
          >
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
