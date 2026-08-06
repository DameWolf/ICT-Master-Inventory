import { useState, useCallback, useEffect } from "react";
import Topbar from "./components/Topbar";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import InventoryTable from "./components/InventoryTable";
import SettingsModal from "./components/SettingsModal";
import QRScanner from "./components/QRScanner";
import Toast from "./components/Toast";
import { useSheetInventory } from "./hooks/useSheetInventory";
import "./App.css";

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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [view, setView]                     = useState("home"); // "home" | "dashboard" | "table"
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [scannerOpen, setScannerOpen]       = useState(false);
  const [toasts, setToasts]                 = useState([]);

  // Dark Mode state initialized from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("ict_theme") === "dark";
  });

  // Apply data-theme attribute on document root whenever darkMode changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("ict_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const { inventory, loading, error, lastSynced, refetch, addItem, updateItem, deleteItem } =
    useSheetInventory();

  // ── Toast helpers ──
  const addToast = useCallback((t) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { ...t, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Navigation ──
  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setView("table");
  };

  const handleViewAllTable = () => { setSelectedCategory(null); setView("table"); };
  const handleDashboard    = () => { setSelectedCategory(null); setView("dashboard"); };
  const handleHome         = () => { setSelectedCategory(null); setView("home"); };

  // ── QR Scanner: "Find in Inventory" navigates to the matched category ──
  const handleFindFromQR = useCallback((parsed) => {
    setScannerOpen(false);
    const catName = parsed.category;
    if (catName) {
      setSelectedCategory(catName);
      setView("table");
    }
  }, []);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} onRetry={refetch} />;

  return (
    <div className="app-layout">
      <Topbar
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        onHome={handleHome}
        onDashboard={handleDashboard}
        onSettings={() => setSettingsOpen(true)}
        onScannerOpen={() => setScannerOpen(true)}
        inventory={inventory}
        lastSynced={lastSynced}
        onSync={refetch}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        activeView={view}
      />

      <main className="app-content">
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
          />
        ) : (
          <InventoryTable
            inventory={inventory}
            selectedCategory={selectedCategory}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onAdd={addItem}
            onAddToast={addToast}
          />
        )}
      </main>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* QR Scanner Modal */}
      {scannerOpen && (
        <QRScanner
          items={inventory}
          onClose={() => setScannerOpen(false)}
          onFindInInventory={handleFindFromQR}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
