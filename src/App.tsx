import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import AgeGate from "./sections/AgeGate";
import Header from "./sections/Header";
import Hero from "./sections/Hero";
import About from "./sections/About";
import Stats from "./sections/Stats";
import Tools from "./sections/Tools";
import ToolsPage from "./sections/ToolsPage";
import RecipesPage from "./sections/RecipesPage";
import RecipeDetail from "./sections/RecipeDetail";
import PlaceDetail from "./sections/PlaceDetail";
import ProfilePage from "./sections/ProfilePage";
import Recipes from "./sections/Recipes";
import Footer from "./sections/Footer";
import BarMap from "./sections/BarMap";
import RulesPage from "./sections/RulesPage";
import FeedbackPage from "./sections/FeedbackPage";
import AdminPage from "./sections/AdminPage";
import BarMapPreview from "./sections/BarMapPreview";
import StyleSwitcher from "./components/StyleSwitcher";
import SwipeIndicator from "./components/SwipeIndicator";
import ScrollToTop from "./components/ScrollToTop";

const fontMap: Record<string, { heading: string; body: string }> = {
  classic: { heading: '"Playfair Display", Georgia, serif', body: '"Inter", system-ui, sans-serif' },
  modern: { heading: '"Inter", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif' },
  craft: { heading: '"Playfair Display", Georgia, serif', body: '"Source Sans Pro", system-ui, sans-serif' },
};

function HomePage() {
  return (
    <main>
      <Hero />
      <Stats />
      <About />
      <Tools />
      <BarMapPreview />
      <Recipes />
    </main>
  );
}

export default function App() {
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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/barmap" element={<BarMap />} />
        <Route path="/place/:slug" element={<PlaceDetail />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/recipe/:slug" element={<RecipeDetail />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
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
    </div>
  );
}
