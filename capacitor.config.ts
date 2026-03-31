import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.taiseyran.enxoval",
  appName: "Nosso Enxoval",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
