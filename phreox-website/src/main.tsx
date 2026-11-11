import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { SessionContext, useSessionState } from "./api.ts";
import { Layout } from "./components/Layout.tsx";
import "./index.css";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Download } from "./pages/Download.tsx";
import { Home } from "./pages/Home.tsx";
import { About, Features, Legal, NotFound, PlanLayout, EmberPage, GlimmerPage, VoltPage, Safety, Support } from "./pages/Info.tsx";
import { NewsList, NewsPage } from "./pages/News.tsx";

function Root() {
  const { me, reload, ready } = useSessionState();

  if (!ready) return null;

  return (
    <SessionContext.Provider value={{ me, reload }}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="download" element={<Download />} />
            <Route path="news" element={<NewsList />} />
            <Route path="news/:id" element={<NewsPage />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="features" element={<Features />} />
            <Route element={<PlanLayout />}>
              <Route path="ember" element={<EmberPage />} />
              <Route path="volt" element={<VoltPage />} />
              <Route path="glimmer" element={<GlimmerPage />} />
            </Route>
            <Route path="support" element={<Support />} />
            <Route path="safety" element={<Safety />} />
            <Route path="about" element={<About />} />
            <Route path="privacy" element={<Legal page="privacy" />} />
            <Route path="terms" element={<Legal page="terms" />} />
            <Route path="imprint" element={<Legal page="imprint" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Root /></StrictMode>);
