import { useDark, useToggle } from '@vueuse/core';

/** Follows the system theme until the visitor picks one with the toggle. */
export function useTheme() {
  const isDark = useDark({ storageKey: 'ntb-theme' });
  const toggle = useToggle(isDark);
  return { isDark, toggle };
}
