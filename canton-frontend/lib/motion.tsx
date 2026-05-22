"use client";

import { motion, type MotionProps, type Variants } from "motion/react";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

function subscribeToReducedMotion(callback: () => void): () => void {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

const ReducedMotionContext = createContext<boolean>(false);

export function useReducedMotion(): boolean {
  return useContext(ReducedMotionContext);
}

export function ReducedMotionProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  return (
    <ReducedMotionContext.Provider value={prefersReducedMotion}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const defaultTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as const,
};

type MotionDivProps = {
  variants?: Variants;
  children?: ReactNode;
  className?: string;
} & MotionProps;

export function MotionDiv({
  variants = fadeInUp,
  children,
  className,
  ...props
}: MotionDivProps): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const activeVariants = prefersReducedMotion ? reducedMotionVariants : variants;
  const activeTransition = prefersReducedMotion ? { duration: 0.01 } : defaultTransition;
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={activeVariants}
      transition={activeTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
