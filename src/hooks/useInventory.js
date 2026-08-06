import { useState, useEffect, useCallback } from "react";
import { INITIAL_INVENTORY } from "../data/inventoryData";

const STORAGE_KEY = "ict_inventory_data";

export function useInventory() {
  const [inventory, setInventory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  }, [inventory]);

  const addItem = useCallback((item) => {
    const newItem = {
      ...item,
      id: Date.now(),
      dateAdded: new Date().toISOString().split("T")[0],
      serialNumber: item.serialNumber || `ICT-${Date.now()}`
    };
    setInventory((prev) => [newItem, ...prev]);
    return newItem;
  }, []);

  const updateItem = useCallback((id, updates) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteItem = useCallback((id) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const resetToDefault = useCallback(() => {
    setInventory(INITIAL_INVENTORY);
  }, []);

  return { inventory, addItem, updateItem, deleteItem, resetToDefault };
}
