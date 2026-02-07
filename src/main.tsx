import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW, listenForInstallPrompt } from "./lib/registerSW";
import { initializeTheme } from "./lib/services/themeService";
import { pwaInstallService } from "./lib/services/pwaInstallService";

// Initialize theme before render to prevent flash
initializeTheme();

// Initialize PWA install service
pwaInstallService.init();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

createRoot(rootElement).render(<App />);

// Register service worker for PWA support
if (import.meta.env.PROD) {
  registerSW({
    onNeedRefresh: () => {
      // You can show a toast/notification here
      console.log("New content available. Please refresh.");
    },
    onOfflineReady: () => {
      console.log("App ready to work offline.");
    },
    onRegistered: (registration) => {
      console.log("Service worker registered:", registration);
    },
    onRegisterError: (error) => {
      console.error("Service worker registration failed:", error);
    },
  });

  // Listen for install prompt
  listenForInstallPrompt((event) => {
    console.log("Install prompt available:", event);
  });
}
