import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Theme {
  background: string;
  white: string;
  ink: string;
  text: string;
  muted: string;
  light: string;

  primary: string;
  primaryDark: string;
  primarySoft: string;
  softPrimary: string;

  blue: string;
  blueSoft: string;

  coral: string;
  coralSoft: string;

  orange: string;
  orangeSoft: string;

  green: string;
  greenSoft: string;

  success: string;
  successSoft: string;

  danger: string;
  dangerSoft: string;

  warning: string;
  warningSoft: string;

  input: string;

  border: string;
  divider: string;
  dark: string;
  everWhite: string;
}

interface ThemeContextType {
  isDarkMode: boolean;
  theme: Theme;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
}

const lightTheme: Theme = {
  background: "#F7F6F2",

  white: "#FFFFFF",
  everWhite: "#FFFFFF",

  ink: "#242720",
  text: "#242720",
  muted: "#777D72",
  light: "#A7ADA4",

  primary: "#A47745",
  primaryDark: "#805A32",
  primarySoft: "#F5EDE2",
  softPrimary: "#F5EDE2",

  blue: "#4FA3D1",
  blueSoft: "#E8F4FA",

  coral: "#C34D4D",
  coralSoft: "#FCECEC",

  orange: "#A66C13",
  orangeSoft: "#FFF3D9",

  green: "#238653",
  greenSoft: "#E7F5EC",

  success: "#238653",
  successSoft: "#E7F5EC",

  danger: "#C34D4D",
  dangerSoft: "#FCECEC",

  warning: "#A66C13",
  warningSoft: "#FFF3D9",

  input: "#FFFFFF",

  border: "#E6E5DD",
  divider: "#ECEBE5",

  dark: "#242720",
};

const darkTheme: Theme = {
  background: "#151715",

  white: "#202320",
  everWhite: "#FFFFFF",

  ink: "#F4F4EF",
  text: "#F4F4EF",
  muted: "#A7ADA4",
  light: "#777D72",

  primary: "#A47745",
  primaryDark: "#C29460",
  primarySoft: "#3A3025",
  softPrimary: "#3A3025",

  blue: "#62B5E5",
  blueSoft: "#1C3445",

  coral: "#F07870",
  coralSoft: "#3D2525",

  orange: "#FFB74D",
  orangeSoft: "#3D3320",

  green: "#43B98D",
  greenSoft: "#1D3829",

  success: "#43B98D",
  successSoft: "#1D3829",

  danger: "#F07870",
  dangerSoft: "#3D2525",

  warning: "#FFB74D",
  warningSoft: "#3D3320",

  input: "#202320",

  border: "#3A4039",
  divider: "#2B302A",

  dark: "#0D100D",
};

const STORAGE_KEY = "sp-support-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyThemeToDocument = (theme: Theme, isDarkMode: boolean) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.classList.toggle("dark", isDarkMode);
  root.dataset.theme = isDarkMode ? "dark" : "light";
  root.style.colorScheme = isDarkMode ? "dark" : "light";

  Object.entries(theme).forEach(([key, value]) => {
    const cssVariable = `--theme-${key.replace(
      /[A-Z]/g,
      (letter) => `-${letter.toLowerCase()}`,
    )}`;

    root.style.setProperty(cssVariable, value);
  });
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;

    try {
      return localStorage.getItem(STORAGE_KEY) === "dark";
    } catch {
      return false;
    }
  });

  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    applyThemeToDocument(theme, isDarkMode);

    try {
      localStorage.setItem(STORAGE_KEY, isDarkMode ? "dark" : "light");
    } catch {
      // Theme continues working even if storage is unavailable.
    }
  }, [theme, isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value);
  };

  const contextValue = useMemo(
    () => ({
      isDarkMode,
      theme,
      toggleTheme,
      setDarkMode,
    }),
    [isDarkMode, theme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
};
