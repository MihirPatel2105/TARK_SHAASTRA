import { createContext, useCallback, useMemo } from "react";

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const t = useCallback((key) => key, []);

  const value = useMemo(
    () => ({
      t,
    }),
    [t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
