import { useState, useCallback } from "react";
import Topbar from "./components/Topbar";
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
  const [view, setView]             = useState("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [toasts, setToasts]         = useState([]);

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

  const handleViewAll = () => { setSelectedCategory(null); setView("table"); };
  const handleHome    = () => { setSelectedCategory(null); setView("dashboard"); };

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
        onSettings={() => setSettingsOpen(true)}
        onScannerOpen={() => setScannerOpen(true)}
        inventory={inventory}
        lastSynced={lastSynced}
        onSync={refetch}
      />

      <main className="app-content">
        {view === "dashboard" ? (
          <Dashboard
            inventory={inventory}
            onSelectCategory={handleSelectCategory}
            onViewAll={handleViewAll}
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
          onClose={() => setScannerOpen(false)}
          onFindInInventory={handleFindFromQR}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;

