import { useState, useCallback, useEffect } from "react";
import Topbar from "./components/Topbar";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import InventoryTable from "./components/InventoryTable";
import SettingsModal from "./components/SettingsModal";
import SupabaseLoginModal from "./components/SupabaseLoginModal";
import QRScanner from "./components/QRScanner";
import Toast from "./components/Toast";
import AIChat from "./components/AIChat";
import PMChecklist from "./components/PMChecklist";
import { useSupabaseInventory } from "./hooks/useSupabaseInventory";
import { supabase } from "./lib/supabase";
import "./App.css";

function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="loading-spinner" />
      <p className="loading-text">Loading inventory from Supabase…</p>
      <span className="loading-sub">Fetching live data</span>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="app-error">
      <span className="error-icon">⚠️</span>
      <h2>Failed to load data</h2>
      <p>{message}</p>
      <button className="retry-btn" onClick={onRetry}>🔄 Retry</button>
    </div>
  );
}

let toastIdCounter = 0;

function App() {
  const APP_CACHE_BUSTER = "ict_app_cache_v2_supabase_only_2026_11_05";

  const [selectedCategory, setSelectedCategoryState] = useState(() => {
    try {
      return localStorage.getItem("ict_selected_category") || null;
    } catch {
      return null;
    }
  });

  const clearLegacyInventoryCache = useCallback(() => {
    const staleKeys = [
      "ict_inventory_data",
      "ict_local_edits",
      "ict_local_adds",
      "ict_local_deletes",
      "ict_table_search",
      "ict_table_status_filter",
      "ict_table_campus_filter",
      "ict_table_page",
      "ict_current_view",
      "ict_selected_category",
      "ict_theme",
      "ict_sync_last_run",
      "ict_dashboard_summary",
      "ict_last_inventory_snapshot",
      "ict_app_cache_buster",
      "ict_app_state",
      "sheets_inventory_snapshot"
    ];

    staleKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore localStorage issues
      }
    });

    try {
      localStorage.setItem("ict_app_cache_buster", APP_CACHE_BUSTER);
    } catch {
      // ignore localStorage issues
    }
  }, [APP_CACHE_BUSTER]);

  useEffect(() => {
    try {
      const currentBuster = localStorage.getItem("ict_app_cache_buster");
      if (currentBuster !== APP_CACHE_BUSTER) {
        clearLegacyInventoryCache();
      }
    } catch {
      // ignore localStorage issues
    }
  }, [APP_CACHE_BUSTER, clearLegacyInventoryCache]);

  const [view, setViewState] = useState(() => {
    try {
      return localStorage.getItem("ict_current_view") || "home";
    } catch {
      return "home";
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pmChecklistOpen, setPMChecklistOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const setView = (newView) => {
    setViewState(newView);
    localStorage.setItem("ict_current_view", newView);
  };

  const setSelectedCategory = (cat) => {
    setSelectedCategoryState(cat);
    if (cat) {
      localStorage.setItem("ict_selected_category", cat);
    } else {
      localStorage.removeItem("ict_selected_category");
    }
  };

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("ict_theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("ict_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data?.session;
      setIsAuthenticated(Boolean(session));
      setUserEmail(session?.user?.email || "");
    }

    syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setUserEmail(session?.user?.email || "");
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const { inventory, loading, error, lastSynced, refetch, addItem, updateItem, deleteItem } = useSupabaseInventory();

  const addToast = useCallback((t) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { ...t, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setView("table");
  };

  const handleViewAllTable = () => { setSelectedCategory(null); setView("table"); };
  const handleDashboard = () => { setSelectedCategory(null); setView("dashboard"); };
  const handleHome = () => { setSelectedCategory(null); setView("home"); };

  const handleFindFromQR = useCallback((parsed) => {
    setScannerOpen(false);
    const catName = parsed.category;
    if (catName) {
      setSelectedCategory(catName);
      setView("table");
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserEmail("");
  }, []);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return false;
    }
    return true;
  }, [isAuthenticated]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <div className="app-layout">
      <Topbar
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        onHome={handleHome}
        onDashboard={handleDashboard}
        onSettings={() => setSettingsOpen(true)}
        onScannerOpen={() => setScannerOpen(true)}
        onOpenPMChecklist={() => setPMChecklistOpen(true)}
        inventory={inventory}
        lastSynced={lastSynced}
        onSync={refetch}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        activeView={view}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onOpenSupabaseLogin={() => setLoginOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className={`app-content${view === "home" ? " app-content--home" : ""}`}>
        {view === "home" ? (
          <HomePage
            inventory={inventory}
            onSelectCategory={handleSelectCategory}
            onViewDashboard={handleDashboard}
            onViewAllTable={handleViewAllTable}
            onScannerOpen={() => setScannerOpen(true)}
            onBatchQrOpen={handleViewAllTable}
            onAddDevice={handleViewAllTable}
          />
        ) : view === "dashboard" ? (
          <Dashboard
            inventory={inventory}
            onSelectCategory={handleSelectCategory}
            onViewAll={handleViewAllTable}
            darkMode={darkMode}
          />
        ) : (
          <InventoryTable
            inventory={inventory}
            selectedCategory={selectedCategory}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onAdd={addItem}
            onAddToast={addToast}
            onRequireAuth={requireAuth}
          />
        )}
      </main>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {loginOpen && <SupabaseLoginModal onClose={() => setLoginOpen(false)} onAuthenticated={() => setLoginOpen(false)} />}

      {pmChecklistOpen && (
        <PMChecklist
          inventory={inventory}
          onClose={() => setPMChecklistOpen(false)}
        />
      )}

      {scannerOpen && (
        <QRScanner
          items={inventory}
          onClose={() => setScannerOpen(false)}
          onFindInInventory={handleFindFromQR}
        />
      )}

      <AIChat
        inventory={inventory}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
