import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    errorType: typeof event.error,
    errorString: String(event.error)
  });
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    reasonType: typeof event.reason,
    reasonString: String(event.reason),
    promise: event.promise
  });
});

createRoot(document.getElementById("root")!).render(<App />);
