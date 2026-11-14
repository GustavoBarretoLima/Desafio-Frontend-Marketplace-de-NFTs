import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const queryClient = new QueryClient();

async function startApp() {
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === "true") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }

  // Engine.IO captures the WebSocket constructor when its module loads.
  // Start MSW before importing any module that loads Socket.IO.
  const [{ router }, { CatalogUpdates }] = await Promise.all([
    import("./router"),
    import("./CatalogUpdates"),
  ]);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <CatalogUpdates />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void startApp();
