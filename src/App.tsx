import { useState, useEffect, lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import AgeGate from "./sections/AgeGate";
import Header from "./sections/Header";
import Hero from "./sections/Hero";
import About from "./sections/About";
import Stats from "./sections/Stats";
import Tools from "./sections/Tools";
import Recipes from "./sections/Recipes";
import Footer from "./sections/Footer";
import BarMapPreview from "./sections/BarMapPreview";
import VinokurPreview from "./sections/VinokurPreview";
import StyleSwitcher from "./components/StyleSwitcher";
import SwipeIndicator from "./components/SwipeIndicator";
import ScrollToTop from "./components/ScrollToTop";
import AddToHomeScreenPrompt from "./components/AddToHomeScreenPrompt";
import ChunkErrorBoundary from "./components/ChunkErrorBoundary";

/* Lazy-loaded pages — code splitting for faster initial load */
const ToolsPage = lazy(() => import("./sections/ToolsPage"));
const RecipesPage = lazy(() => import("./sections/RecipesPage"));
const RecipeDetail = lazy(() => import("./sections/RecipeDetail"));
const PlaceDetail = lazy(() => import("./sections/PlaceDetail"));
const ProfilePage = lazy(() => import("./sections/ProfilePage"));
const BarMap = lazy(() => import("./sections/BarMap"));
const RulesPage = lazy(() => import("./sections/RulesPage"));
const PrivacyPolicyPage = lazy(() => import("./sections/PrivacyPolicyPage"));
const OfferPage = lazy(() => import("./sections/OfferPage"));
const FeedbackPage = lazy(() => import("./sections/FeedbackPage"));
const AdminPage = lazy(() => import("./sections/AdminPage"));
const RecipeParserPage = lazy(() => import("./sections/RecipeParserPage"));
const PlaceParserPage = lazy(() => import("./sections/PlaceParserPage"));
const LoginPage = lazy(() => import("./sections/LoginPage"));
const LabelGeneratorPage = lazy(() => import("./sections/LabelGeneratorPage"));
const AboutPage = lazy(() => import("./sections/AboutPage"));
const VinokurPage = lazy(() => import("./sections/VinokurPage"));


function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div
        className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
      />
    </div>
  );
}

const fontMap: Record<string, { heading: string; body: string }> = {
  classic: { heading: '"Playfair Display", Georgia, serif', body: '"Inter", system-ui, sans-serif' },
  modern: { heading: '"Inter", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  craft: { heading: '"Playfair Display", Georgia, serif', body: '"Source Sans 3", system-ui, sans-serif' },
};

function HomePage() {
  return (
    <main>
      <Hero />
      <Stats />
      <About />
      <Tools />
      <BarMapPreview />
      <VinokurPreview />
      <Recipes />
    </main>
  );
}

function Layout() {
  const [activePalette, setActivePalette] = useState(() => localStorage.getItem("theme-palette") || "warm-amber");
  const [activeFont, setActiveFont] = useState(() => localStorage.getItem("theme-font") || "classic");
  const [activeScale, setActiveScale] = useState(() => localStorage.getItem("theme-scale") || "1");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activePalette);
    localStorage.setItem("theme-palette", activePalette);
  }, [activePalette]);

  useEffect(() => {
    const fonts = fontMap[activeFont];
    document.documentElement.style.setProperty("--font-heading", fonts.heading);
    document.documentElement.style.setProperty("--font-body", fonts.body);
    localStorage.setItem("theme-font", activeFont);
  }, [activeFont]);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", activeScale);
    localStorage.setItem("theme-scale", activeScale);
  }, [activeScale]);

  return (
    <div className="min-h-screen theme-transition">
      <ScrollToTop />
      <AgeGate />
      <Header />
      <Outlet />
      <Footer />
      <StyleSwitcher
        activePalette={activePalette}
        activeFont={activeFont}
        activeScale={activeScale}
        onPaletteChange={setActivePalette}
        onFontChange={setActiveFont}
        onScaleChange={setActiveScale}
      />
      <SwipeIndicator />
      <AddToHomeScreenPrompt />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/recipes", element: <Suspense fallback={<PageLoader />}><RecipesPage /></Suspense> },
      { path: "/tools", element: <Suspense fallback={<PageLoader />}><ToolsPage /></Suspense> },
      { path: "/barmap", element: <Suspense fallback={<PageLoader />}><BarMap /></Suspense> },
      { path: "/vinokur", element: <Suspense fallback={<PageLoader />}><VinokurPage /></Suspense> },
      { path: "/place/:slug", element: <Suspense fallback={<PageLoader />}><PlaceDetail /></Suspense> },
      { path: "/rules", element: <Suspense fallback={<PageLoader />}><RulesPage /></Suspense> },
      { path: "/privacy", element: <Suspense fallback={<PageLoader />}><PrivacyPolicyPage /></Suspense> },
      { path: "/offer", element: <Suspense fallback={<PageLoader />}><OfferPage /></Suspense> },
      { path: "/about", element: <Suspense fallback={<PageLoader />}><AboutPage /></Suspense> },
      { path: "/profile", element: <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense> },
      { path: "/recipe/:slug", element: <Suspense fallback={<PageLoader />}><RecipeDetail /></Suspense> },
      { path: "/feedback", element: <Suspense fallback={<PageLoader />}><FeedbackPage /></Suspense> },
      { path: "/admin", element: <Suspense fallback={<PageLoader />}><AdminPage /></Suspense> },
      { path: "/tools/parse-recipe", element: <Suspense fallback={<PageLoader />}><RecipeParserPage /></Suspense> },
      { path: "/tools/parse-place", element: <Suspense fallback={<PageLoader />}><PlaceParserPage /></Suspense> },
      { path: "/tools/generate-label", element: <Suspense fallback={<PageLoader />}><LabelGeneratorPage /></Suspense> },
      { path: "/login", element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
      { path: "/reset-password", element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
    ],
  },
]);

export default function App() {
  return (
    <ChunkErrorBoundary>
      <RouterProvider router={router} />
    </ChunkErrorBoundary>
  );
}
// deploy marker 1779376610
