export const themeConfig = {
  storageKey: "etymolog-theme",
  light: {
    name: "newspaper",
    color: "#f5f0e5",
  },
  dark: {
    name: "newspaper-dark",
    color: "#24231f",
  },
} as const;

export const defaultTheme = themeConfig.light;
