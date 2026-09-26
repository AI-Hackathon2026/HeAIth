import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// Root of the client-side app, mounted by src/app/[[...slug]]/ClientApp.tsx.
export default function ClientRoot() {
  return (
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}
