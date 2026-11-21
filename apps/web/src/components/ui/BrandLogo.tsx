import { motion } from 'motion/react';

interface BrandLogoProps {
  size?: number;
  animated?: boolean;
}

export function BrandLogo({ size = 56, animated = true }: BrandLogoProps) {
  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.88 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="cm-grad-front" x1="12" y1="10" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4D6D" />
            <stop offset="60%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
          <linearGradient id="cm-grad-back" x1="6" y1="8" x2="46" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#262B40" />
            <stop offset="100%" stopColor="#161927" />
          </linearGradient>
        </defs>

        {/* Card traseiro inclinado */}
        <rect
          x="10"
          y="13"
          width="34"
          height="42"
          rx="9"
          transform="rotate(-11 10 13)"
          fill="url(#cm-grad-back)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.5"
        />

        {/* Card frontal com brilho cinematográfico */}
        <rect
          x="22"
          y="9"
          width="34"
          height="42"
          rx="9"
          transform="rotate(7 22 9)"
          fill="url(#cm-grad-front)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.2"
        />

        {/* Símbolo de Play + Match no centro */}
        <path
          d="M34.2 24.4C34.2 23.1 35.6 22.3 36.7 23L45.1 28.4C46.1 29 46.1 30.5 45.1 31.1L36.7 36.5C35.6 37.2 34.2 36.4 34.2 35.1V24.4Z"
          fill="#FFFFFF"
        />

        {/* Faísca sutil superior */}
        <path
          d="M15 9L16.2 12.2L19.4 13.4L16.2 14.6L15 17.8L13.8 14.6L10.6 13.4L13.8 12.2L15 9Z"
          fill="#FDBA74"
        />
      </svg>
    </motion.div>
  );
}
