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
import ServiceRequestModal from "./components/ServiceRequestModal";
import { useSheetInventory } from "./hooks/useSheetInventory";
import useServiceRequests from "./hooks/useServiceRequests";
import { supabase } from "./lib/supabase";
import "./App.css";

function safeStorageGet(key, fallback = null) {
  try {
    if (typeof window === "undefined") return fallback;
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage access issues
  }
}

function safeStorageRemove(key) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage access issues
  }
}

function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="loading-spinner" />
      <p className="loading-text">Loading inventory from Google Sheets…</p>
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
  const APP_CACHE_BUSTER = "ict_app_cache_v2_google_sheets_primary_2026_11_09";

  const [selectedCategory, setSelectedCategoryState] = useState(() => {
    return safeStorageGet("ict_selected_category");
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

    staleKeys.forEach((key) => safeStorageRemove(key));
    safeStorageSet("ict_app_cache_buster", APP_CACHE_BUSTER);
  }, [APP_CACHE_BUSTER]);

  useEffect(() => {
    const currentBuster = safeStorageGet("ict_app_cache_buster");
    if (currentBuster !== APP_CACHE_BUSTER) {
      clearLegacyInventoryCache();
    }
  }, [APP_CACHE_BUSTER, clearLegacyInventoryCache]);

  const [view, setViewState] = useState(() => {
    return safeStorageGet("ict_current_view", "home");
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pmChecklistOpen, setPMChecklistOpen] = useState(false);
  const [serviceRequestOpen, setServiceRequestOpen] = useState(false);
  const [serviceRequestTargetItem, setServiceRequestTargetItem] = useState(null);
  const { serviceRequests, addServiceRequest, updateServiceRequest } = useServiceRequests();

  const handleServiceRequestStatusChange = useCallback(async (requestId, nextStatus) => {
    if (!requestId || !nextStatus) return;

    try {
      await updateServiceRequest(requestId, { status: nextStatus });
      addToast({
        type: "success",
        message: `Service request status updated to ${nextStatus}.`,
        duration: 3000,
      });
    } catch (err) {
      addToast({
        type: "error",
        message: err?.message || "Could not update request status.",
        duration: 4000,
      });
    }
  }, [addToast, updateServiceRequest]);

  const setView = (newView) => {
    setViewState(newView);
    safeStorageSet("ict_current_view", newView);
  };

  const setSelectedCategory = (cat) => {
    setSelectedCategoryState(cat);
    if (cat) {
      safeStorageSet("ict_selected_category", cat);
    } else {
      safeStorageRemove("ict_selected_category");
    }
  };

  const [darkMode, setDarkMode] = useState(() => {
    return safeStorageGet("ict_theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    safeStorageSet("ict_theme", darkMode ? "dark" : "light");
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

  const { inventory, loading, error, lastSynced, refetch, addItem, updateItem, deleteItem } = useSheetInventory();

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

  const handleOpenServiceRequest = useCallback((item = null) => {
    setServiceRequestTargetItem(item);
    setServiceRequestOpen(true);
  }, []);

  const handleServiceRequestSubmit = useCallback(async (request) => {
    try {
      const saved = await addServiceRequest(request);
      addToast({
        type: "success",
        message: `Service request ${saved.id} submitted successfully.`,
        duration: 4000,
      });
    } catch (err) {
      addToast({
        type: "error",
        message: err?.message || "Service request could not be saved.",
        duration: 4000,
      });
    }
  }, [addServiceRequest, addToast]);

  useEffect(() => {
    safeStorageSet("ict_service_requests_v1", JSON.stringify(serviceRequests));
  }, [serviceRequests]);

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
        onOpenServiceRequest={handleOpenServiceRequest}
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
            onOpenServiceRequest={handleOpenServiceRequest}
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

      {serviceRequestOpen && (
        <ServiceRequestModal
          item={serviceRequestTargetItem}
          inventory={inventory}
          requests={serviceRequests}
          onClose={() => {
            setServiceRequestTargetItem(null);
            setServiceRequestOpen(false);
          }}
          onSubmit={handleServiceRequestSubmit}
          onStatusChange={handleServiceRequestStatusChange}
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
