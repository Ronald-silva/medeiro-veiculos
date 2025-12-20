import { motion } from 'framer-motion';

export default function Badge({
  children,
  variant = 'default',
  icon,
  animate = false
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    urgency: 'bg-red-500 text-white shadow-lg',
    sold: 'bg-gray-800 text-white',
    limited: 'bg-orange-500 text-white shadow-md',
    verified: 'bg-green-500 text-white',
    live: 'bg-blue-500 text-white',
    primary: 'bg-primary text-white',
    whatsapp: 'bg-whatsapp text-white'
  };

  const Component = animate ? motion.span : 'span';
  const animationProps = animate
    ? {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: 0.3 }
      }
    : {};

  return (
    <Component
      {...animationProps}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </Component>
  );
}
