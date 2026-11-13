import { useCallback, useEffect, useState } from "react";
import { hasSupabaseConfig, supabase, SUPABASE_SERVICE_REQUESTS_TABLE } from "../lib/supabase";

const STORAGE_KEY = "ict_service_requests_v1";

function getLocalRequests() {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLocalRequests(requests) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Ignore storage write failures.
  }
}

function mapRowToRequest(row) {
  return {
    id: row.id || `SR-${Date.now()}`,
    itemId: row.item_id != null && row.item_id !== "" ? String(row.item_id) : "",
    assetName: row.asset_name || row.assetName || "Unassigned asset",
    requestType: row.request_type || row.requestType || "Hardware Fault",
    priority: row.priority || row.priority || "Medium",
    requester: row.requester || "",
    department: row.department || "",
    campus: row.campus || "Main",
    contact: row.contact || "",
    room: row.room || "",
    issueSummary: row.issue_summary || row.issueSummary || "",
    preferredDate: row.preferred_date || row.preferredDate || "",
    notes: row.notes || "",
    status: row.status || "Open",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapRequestToRow(request) {
  const itemId = request.itemId === "" || request.itemId == null ? null : Number(request.itemId);

  return {
    id: request.id || `SR-${Date.now()}`,
    item_id: Number.isFinite(itemId) ? itemId : null,
    asset_name: request.assetName || "Unassigned asset",
    request_type: request.requestType || "Hardware Fault",
    priority: request.priority || "Medium",
    requester: request.requester || "",
    department: request.department || "",
    campus: request.campus || "Main",
    contact: request.contact || "",
    room: request.room || "",
    issue_summary: request.issueSummary || "",
    preferred_date: request.preferredDate || "",
    notes: request.notes || "",
    status: request.status || "Open",
    created_at: request.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default function useServiceRequests() {
  const [serviceRequests, setServiceRequests] = useState(() => getLocalRequests());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) {
      const next = getLocalRequests();
      setServiceRequests(next);
      setError(null);
      return next;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from(SUPABASE_SERVICE_REQUESTS_TABLE)
        .select("*")
        .order("created_at", { ascending: false });

      if (loadError) {
        throw loadError;
      }

      const next = (data || []).map(mapRowToRequest);
      setServiceRequests(next);
      persistLocalRequests(next);
      return next;
    } catch (err) {
      const next = getLocalRequests();
      setServiceRequests(next);
      setError(err.message || "Failed to load service requests.");
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addServiceRequest = useCallback(async (request) => {
    const normalized = {
      ...request,
      id: request.id || `SR-${Date.now()}`,
      status: request.status || "Open",
      priority: request.priority || "Medium",
      createdAt: request.createdAt || new Date().toISOString(),
    };

    if (!hasSupabaseConfig || !supabase) {
      const next = [normalized, ...getLocalRequests()];
      setServiceRequests(next);
      persistLocalRequests(next);
      return normalized;
    }

    try {
      const row = mapRequestToRow(normalized);
      const { data, error: insertError } = await supabase
        .from(SUPABASE_SERVICE_REQUESTS_TABLE)
        .insert([row])
        .select();

      if (insertError) {
        throw insertError;
      }

      const saved = (data && data[0]) ? mapRowToRequest(data[0]) : normalized;
      const next = [saved, ...getLocalRequests().filter((entry) => entry.id !== saved.id)];
      setServiceRequests(next);
      persistLocalRequests(next);
      return saved;
    } catch (err) {
      const next = [normalized, ...getLocalRequests()];
      setServiceRequests(next);
      persistLocalRequests(next);
      setError(err.message || "Failed to save service request.");
      return normalized;
    }
  }, []);

  const updateServiceRequest = useCallback(async (id, updates) => {
    const current = serviceRequests.find((request) => request.id === id);
    if (!current) return null;

    const merged = { ...current, ...updates };

    if (!hasSupabaseConfig || !supabase) {
      const next = serviceRequests.map((request) => (request.id === id ? merged : request));
      setServiceRequests(next);
      persistLocalRequests(next);
      return merged;
    }

    try {
      const row = mapRequestToRow(merged);
      const { data, error: updateError } = await supabase
        .from(SUPABASE_SERVICE_REQUESTS_TABLE)
        .update({
          item_id: row.item_id,
          asset_name: row.asset_name,
          request_type: row.request_type,
          priority: row.priority,
          requester: row.requester,
          department: row.department,
          campus: row.campus,
          contact: row.contact,
          room: row.room,
          issue_summary: row.issue_summary,
          preferred_date: row.preferred_date,
          notes: row.notes,
          status: row.status,
          updated_at: row.updated_at,
        })
        .eq("id", id)
        .select();

      if (updateError) {
        throw updateError;
      }

      const next = serviceRequests.map((request) => (request.id === id ? mapRowToRequest((data && data[0]) || row) : request));
      setServiceRequests(next);
      persistLocalRequests(next);
      return next.find((request) => request.id === id) || merged;
    } catch (err) {
      const next = serviceRequests.map((request) => (request.id === id ? merged : request));
      setServiceRequests(next);
      persistLocalRequests(next);
      setError(err.message || "Failed to update service request.");
      return merged;
    }
  }, [serviceRequests]);

  return {
    serviceRequests,
    loading,
    error,
    refetch,
    addServiceRequest,
    updateServiceRequest,
  };
}
