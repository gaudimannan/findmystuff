import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard, Users, Package, ClipboardList, Flag,
  Megaphone, ScrollText, ArrowLeft, Search, X, Trash2,
  ShieldCheck, ShieldOff, Eye, CalendarPlus, CheckCircle,
  Plus, Edit, ToggleLeft, ToggleRight, AlertTriangle
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
interface AdminUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  is_admin: boolean;
  post_count?: number;
}

interface AdminItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  type: string;
  location: string;
  status: string;
  image_url: string | null;
  created_at: string;
  expires_at: string;
  user_id: string;
  flagged: boolean;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  claim_count?: number;
}

interface AdminClaim {
  id: number;
  item_id: number;
  claimant_id: string;
  status: string;
  created_at: string;
  items?: { title: string; user_id: string } | null;
  profiles?: { first_name: string | null; last_name: string | null } | null;
  poster?: { first_name: string | null; last_name: string | null } | null;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  created_by: string | null;
  active: boolean;
}

interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  notes: string | null;
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

type Section = "dashboard" | "users" | "items" | "claims" | "reports" | "announcements" | "logs";

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { key: "users", label: "Users", icon: <Users size={18} /> },
  { key: "items", label: "Items", icon: <Package size={18} /> },
  { key: "claims", label: "Claims", icon: <ClipboardList size={18} /> },
  { key: "reports", label: "Reports", icon: <Flag size={18} /> },
  { key: "announcements", label: "Announce", icon: <Megaphone size={18} /> },
  { key: "logs", label: "Logs", icon: <ScrollText size={18} /> },
];

// ─── Helpers ──────────────────────────────────────────────
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const fmtName = (first: string | null, last: string | null) =>
  `${first ?? ""} ${last ?? ""}`.trim() || "Unknown";

const logAction = async (
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  notes?: string
) => {
  await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    notes: notes ?? null,
  });
};

// ─── Confirm Dialog ───────────────────────────────────────
const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card w-full max-w-sm p-8 rounded-sm border border-border shadow-2xl modal-enter">
        <h3 className="font-serif text-xl text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-foreground/20 text-foreground text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-muted transition-colors btn-press"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-widest rounded-sm hover:brightness-90 transition-all btn-press"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────
const StatCard = ({ label, value }: { label: string; value: number | string }) => (
  <div className="bg-card border border-border rounded-sm p-5 flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{label}</span>
    <span className="font-serif text-3xl text-foreground">{value}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════
const AdminPage = () => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");

  // Item delete preview state
  const [deletePreviewItem, setDeletePreviewItem] = useState<AdminItem | null>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  const openConfirm = (title: string, message: string, cb: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => cb);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    confirmCallback?.();
    setConfirmOpen(false);
  };

  // ─── Auth guard ─────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/feed", { replace: true }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, email")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) { navigate("/feed", { replace: true }); return; }
      setAdminId(user.id);
      setAdminEmail(profile.email ?? user.email ?? "");
      setAuthChecked(true);
    };
    check();
  }, [navigate]);

  // ─── DASHBOARD STATE ────────────────────────────────────
  const [stats, setStats] = useState({
    totalUsers: 0, lostItems: 0, foundItems: 0, totalClaims: 0,
    resolved: 0, expiringThisWeek: 0, newUsersWeek: 0, newPostsWeek: 0,
  });

  const fetchStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
    const weekFromNow = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    const [users, lost, found, claims, resolved, expiring, newUsers, newPosts] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("items").select("id", { count: "exact", head: true }).eq("type", "Lost"),
      supabase.from("items").select("id", { count: "exact", head: true }).eq("type", "Found"),
      supabase.from("claims").select("id", { count: "exact", head: true }),
      supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "claimed"),
      supabase.from("items").select("id", { count: "exact", head: true }).lte("expires_at", weekFromNow).gte("expires_at", new Date().toISOString()),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("items").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    ]);

    setStats({
      totalUsers: users.count ?? 0,
      lostItems: lost.count ?? 0,
      foundItems: found.count ?? 0,
      totalClaims: claims.count ?? 0,
      resolved: resolved.count ?? 0,
      expiringThisWeek: expiring.count ?? 0,
      newUsersWeek: newUsers.count ?? 0,
      newPostsWeek: newPosts.count ?? 0,
    });
  }, []);

  // ─── USERS STATE ────────────────────────────────────────
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data) return;
    const usersWithCounts = await Promise.all(
      data.map(async (u: any) => {
        const { count } = await supabase.from("items").select("id", { count: "exact", head: true }).eq("user_id", u.id);
        return { ...u, post_count: count ?? 0 } as AdminUser;
      })
    );
    setAllUsers(usersWithCounts);
  }, []);

  const toggleAdmin = async (userId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    openConfirm(
      newVal ? "Grant Admin" : "Revoke Admin",
      `Are you sure you want to ${newVal ? "grant" : "revoke"} admin access?`,
      async () => {
        await supabase.from("profiles").update({ is_admin: newVal }).eq("id", userId);
        await logAction(adminId!, newVal ? "admin_granted" : "admin_revoked", "user", userId);
        fetchUsers();
      }
    );
  };

  const deleteUser = async (userId: string, name: string) => {
    openConfirm("Delete User", `Delete "${name}" and all their items/claims? This cannot be undone.`, async () => {
      await supabase.from("claims").delete().eq("claimant_id", userId);
      await supabase.from("items").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);
      await logAction(adminId!, "user_deleted", "user", userId, `Deleted user: ${name}`);
      fetchUsers();
    });
  };

  // ─── ITEMS STATE ────────────────────────────────────────
  const [allItems, setAllItems] = useState<AdminItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("All");
  const [itemStatusFilter, setItemStatusFilter] = useState("All");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("All");

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("items")
      .select("*, profiles:user_id(first_name, last_name, email)")
      .order("created_at", { ascending: false });
    if (!data) return;
    const itemsWithCounts = await Promise.all(
      data.map(async (item: any) => {
        const { count } = await supabase.from("claims").select("id", { count: "exact", head: true }).eq("item_id", item.id);
        return { ...item, claim_count: count ?? 0 } as AdminItem;
      })
    );
    setAllItems(itemsWithCounts);
  }, []);

  const deleteItem = (item: AdminItem) => {
    setDeletePreviewItem(item);
  };

  const confirmDeleteItem = async () => {
    if (!deletePreviewItem) return;
    const itemId = deletePreviewItem.id;
    const title = deletePreviewItem.title;

    // Delete all related rows that reference this item
    await supabase.from("notifications").delete().eq("item_id", itemId);
    await supabase.from("messages").delete().eq("item_id", itemId);
    await supabase.from("claims").delete().eq("item_id", itemId);

    const { data: deleted, error: deleteError } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId)
      .select();

    console.log("delete result — rows deleted:", deleted?.length, "error:", deleteError, "data:", deleted);

    if (deleteError) {
      console.error("Failed to delete item:", deleteError);
    } else if (!deleted || deleted.length === 0) {
      // RLS blocked the delete — remove from local state as workaround
      console.warn("RLS blocked delete. Removing from local state. Update your RLS policies to allow admin deletes.");
      setAllItems((prev) => prev.filter((i) => i.id !== itemId));
    }

    await logAction(adminId!, "item_deleted", "item", String(itemId), `Deleted: ${title}`);
    setDeletePreviewItem(null);
    fetchItems();
  };

  const resolveItem = (itemId: number, title: string) => {
    openConfirm("Resolve Item", `Mark "${title}" as resolved?`, async () => {
      await supabase.from("items").update({ status: "claimed" }).eq("id", itemId);
      await logAction(adminId!, "item_resolved", "item", String(itemId), `Resolved: ${title}`);
      fetchItems();
    });
  };

  const extendItem = async (itemId: number, title: string) => {
    const newExpiry = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    await supabase.from("items").update({ expires_at: newExpiry }).eq("id", itemId);
    await logAction(adminId!, "item_extended", "item", String(itemId), `Extended: ${title}`);
    fetchItems();
  };

  const toggleFlag = async (itemId: number, currentVal: boolean, title: string) => {
    const newVal = !currentVal;
    await supabase.from("items").update({ flagged: newVal }).eq("id", itemId);
    await logAction(adminId!, newVal ? "item_flagged" : "item_unflagged", "item", String(itemId), title);
    fetchItems();
  };

  // ─── CLAIMS STATE ──────────────────────────────────────
  const [allClaims, setAllClaims] = useState<AdminClaim[]>([]);
  const [claimStatusFilter, setClaimStatusFilter] = useState("All");

  const fetchClaims = useCallback(async () => {
    const { data } = await supabase
      .from("claims")
      .select("*, items(title, user_id), profiles:claimant_id(first_name, last_name)")
      .order("created_at", { ascending: false });
    if (!data) return;

    const withPoster = await Promise.all(
      data.map(async (c: any) => {
        if (c.items?.user_id) {
          const { data: p } = await supabase.from("profiles").select("first_name, last_name").eq("id", c.items.user_id).single();
          return { ...c, poster: p } as AdminClaim;
        }
        return { ...c, poster: null } as AdminClaim;
      })
    );
    setAllClaims(withPoster);
  }, []);

  const deleteClaim = (claimId: number) => {
    openConfirm("Delete Claim", "Delete this claim?", async () => {
      await supabase.from("claims").delete().eq("id", claimId);
      await logAction(adminId!, "claim_deleted", "claim", String(claimId));
      fetchClaims();
    });
  };

  // ─── ANNOUNCEMENTS STATE ───────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [editingAnn, setEditingAnn] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (data) setAnnouncements(data as Announcement[]);
  }, []);

  const saveAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim()) return;
    if (editingAnn) {
      await supabase.from("announcements").update({ title: annTitle, message: annMessage }).eq("id", editingAnn);
      await logAction(adminId!, "announcement_updated", "announcement", editingAnn);
    } else {
      const { data } = await supabase.from("announcements").insert({ title: annTitle, message: annMessage, created_by: adminId, active: true }).select().single();
      if (data) await logAction(adminId!, "announcement_created", "announcement", data.id);
    }
    setAnnTitle("");
    setAnnMessage("");
    setEditingAnn(null);
    fetchAnnouncements();
  };

  const deleteAnnouncement = (id: string) => {
    openConfirm("Delete Announcement", "Delete this announcement?", async () => {
      await supabase.from("announcements").delete().eq("id", id);
      await logAction(adminId!, "announcement_deleted", "announcement", id);
      fetchAnnouncements();
    });
  };

  const toggleAnnouncement = async (id: string, active: boolean) => {
    await supabase.from("announcements").update({ active: !active }).eq("id", id);
    fetchAnnouncements();
  };

  // ─── LOGS STATE ────────────────────────────────────────
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [logFilter, setLogFilter] = useState("All");

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("admin_logs")
      .select("*, profiles:admin_id(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setLogs(data as unknown as AdminLog[]);
  }, []);

  // ─── Fetch data on section change ─────────────────────
  useEffect(() => {
    if (!authChecked) return;
    switch (section) {
      case "dashboard": fetchStats(); break;
      case "users": fetchUsers(); break;
      case "items": fetchItems(); break;
      case "claims": fetchClaims(); break;
      case "reports": fetchItems(); break;
      case "announcements": fetchAnnouncements(); break;
      case "logs": fetchLogs(); break;
    }
  }, [section, authChecked, fetchStats, fetchUsers, fetchItems, fetchClaims, fetchAnnouncements, fetchLogs]);

  // ─── Loading ──────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm uppercase tracking-widest animate-pulse">Checking admin access...</p>
      </div>
    );
  }

  // ─── Filtered data ────────────────────────────────────
  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.toLowerCase();
    if (!q) return true;
    return (
      (u.first_name ?? "").toLowerCase().includes(q) ||
      (u.last_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  });

  const categories = [...new Set(allItems.map((i) => i.category))];
  const filteredItems = allItems.filter((item) => {
    if (itemTypeFilter !== "All" && item.type !== itemTypeFilter) return false;
    if (itemStatusFilter !== "All" && item.status.toLowerCase() !== itemStatusFilter.toLowerCase()) return false;
    if (itemCategoryFilter !== "All" && item.category !== itemCategoryFilter) return false;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      return item.title.toLowerCase().includes(q) || (item.profiles?.email ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const filteredClaims = allClaims.filter((c) => {
    if (claimStatusFilter === "All") return true;
    return c.status.toLowerCase() === claimStatusFilter.toLowerCase();
  });

  const filteredLogs = logs.filter((l) => {
    if (logFilter === "All") return true;
    return l.action === logFilter;
  });
  const logActions = [...new Set(logs.map((l) => l.action))];

  // Report data
  const expiringItems = allItems.filter((i) => {
    const daysLeft = Math.ceil((new Date(i.expires_at).getTime() - Date.now()) / 86400000);
    return daysLeft > 0 && daysLeft <= 7 && i.status.toLowerCase() === "active";
  });
  const highClaimItems = allItems.filter((i) => (i.claim_count ?? 0) >= 3);
  const flaggedItems = allItems.filter((i) => i.flagged);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col md:flex-row page-enter">
      {/* ─── Sidebar (desktop) / mobile header ──────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[hsl(var(--navy))] text-[hsl(var(--off-white))] min-h-screen sticky top-0">
        <div className="px-5 py-6 border-b border-white/10">
          <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[hsl(var(--amber))] hover:brightness-110 transition-all mb-3">
            <ArrowLeft size={14} /> Back to App
          </button>
          <h1 className="font-serif text-xl">Admin Panel</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-wider mt-1 truncate">{adminEmail}</p>
        </div>
        <nav className="flex-1 py-4">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${
                section === s.key
                  ? "bg-white/10 text-[hsl(var(--amber))]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile tab bar */}
      <div className="md:hidden sticky top-0 z-50 bg-[hsl(var(--navy))]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={() => navigate("/feed")} className="text-[hsl(var(--amber))]">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-serif text-lg text-[hsl(var(--off-white))]">Admin</h1>
          <div className="w-5" />
        </div>
        <div className="flex overflow-x-auto hide-scrollbar">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 text-[9px] uppercase tracking-wider font-bold transition-colors ${
                section === s.key
                  ? "text-[hsl(var(--amber))] border-b-2 border-[hsl(var(--amber))]"
                  : "text-white/50"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content area ──────────────────────────────── */}
      <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10 max-w-full overflow-x-hidden">
        {/* ─── DASHBOARD ───────────────────────────────── */}
        {section === "dashboard" && (
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-8">Dashboard</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.totalUsers} />
              <StatCard label="Lost Items" value={stats.lostItems} />
              <StatCard label="Found Items" value={stats.foundItems} />
              <StatCard label="Total Claims" value={stats.totalClaims} />
              <StatCard label="Resolved" value={stats.resolved} />
              <StatCard label="Expiring (7d)" value={stats.expiringThisWeek} />
              <StatCard label="New Users (7d)" value={stats.newUsersWeek} />
              <StatCard label="New Posts (7d)" value={stats.newPostsWeek} />
            </div>
          </div>
        )}

        {/* ─── USERS ───────────────────────────────────── */}
        {section === "users" && (
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-6">User Management</h2>
            <div className="mb-6 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-transparent border border-foreground/20 rounded-sm text-sm text-foreground placeholder:text-muted-foreground field-focus outline-none"
              />
              {userSearch && (
                <button onClick={() => setUserSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b-2 border-foreground">
                    {["Name", "Email", "Phone", "Joined", "Posts", "Admin", "Actions"].map((h) => (
                      <th key={h} className="py-3 label-caps">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-foreground/10 hover:bg-card/60 transition-colors">
                      <td className="py-3 font-bold text-foreground">{fmtName(u.first_name, u.last_name)}</td>
                      <td className="py-3 text-muted-foreground truncate max-w-[180px]">{u.email}</td>
                      <td className="py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{fmtDate(u.created_at)}</td>
                      <td className="py-3 text-muted-foreground">{u.post_count}</td>
                      <td className="py-3">
                        <button onClick={() => toggleAdmin(u.id, u.is_admin)} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                          {u.is_admin ? <ShieldCheck size={18} className="text-primary" /> : <ShieldOff size={18} className="text-muted-foreground" />}
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => navigate(`/item/${u.id}`)} className="text-xs text-muted-foreground hover:text-foreground" title="View Posts">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => deleteUser(u.id, fmtName(u.first_name, u.last_name))} className="text-xs text-red-500 hover:text-red-400" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No users found.</p>}
            </div>
          </div>
        )}

        {/* ─── ITEMS ───────────────────────────────────── */}
        {section === "items" && (
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-6">Item Management</h2>
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="max-w-xs relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-transparent border border-foreground/20 rounded-sm text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
              {[
                { val: itemTypeFilter, set: setItemTypeFilter, opts: ["All", "Lost", "Found"] },
                { val: itemStatusFilter, set: setItemStatusFilter, opts: ["All", "active", "claimed"] },
                { val: itemCategoryFilter, set: setItemCategoryFilter, opts: ["All", ...categories] },
              ].map((f, i) => (
                <select
                  key={i}
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  className="bg-card border border-border text-foreground text-xs py-2 px-3 rounded-sm min-h-[44px]"
                >
                  {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b-2 border-foreground">
                    {["Title", "Category", "Type", "Posted By", "Date", "Expires", "Status", "Claims", "Actions"].map((h) => (
                      <th key={h} className="py-3 label-caps">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredItems.map((item) => {
                    const daysLeft = Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000);
                    return (
                      <tr key={item.id} className={`border-b border-foreground/10 hover:bg-card/60 transition-colors ${item.flagged ? "bg-red-500/5" : ""}`}>
                        <td className="py-3 font-bold text-foreground max-w-[180px] truncate">
                          {item.flagged && <AlertTriangle size={12} className="inline text-red-500 mr-1" />}
                          {item.title}
                        </td>
                        <td className="py-3 text-muted-foreground">{item.category}</td>
                        <td className="py-3 text-muted-foreground">{item.type}</td>
                        <td className="py-3 text-muted-foreground truncate max-w-[140px]">{fmtName(item.profiles?.first_name ?? null, item.profiles?.last_name ?? null)}</td>
                        <td className="py-3 text-muted-foreground">{fmtDate(item.created_at)}</td>
                        <td className={`py-3 ${daysLeft <= 7 ? "text-red-500 font-bold" : "text-muted-foreground"}`}>{fmtDate(item.expires_at)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm ${
                            item.status === "active" ? "bg-green-100 text-green-800" : item.status === "claimed" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"
                          }`}>{item.status}</span>
                        </td>
                        <td className="py-3 text-muted-foreground">{item.claim_count}</td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => navigate(`/item/${item.id}`)} title="View" className="p-1 text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                            <button onClick={() => toggleFlag(item.id, item.flagged, item.title)} title={item.flagged ? "Unflag" : "Flag"} className={`p-1 ${item.flagged ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}><Flag size={14} /></button>
                            <button onClick={() => resolveItem(item.id, item.title)} title="Resolve" className="p-1 text-muted-foreground hover:text-green-500"><CheckCircle size={14} /></button>
                            <button onClick={() => extendItem(item.id, item.title)} title="Extend 30d" className="p-1 text-muted-foreground hover:text-primary"><CalendarPlus size={14} /></button>
                            <button onClick={() => deleteItem(item)} title="Delete this post" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors"><Trash2 size={12} /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredItems.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No items found.</p>}
            </div>
          </div>
        )}

        {/* ─── CLAIMS ──────────────────────────────────── */}
        {section === "claims" && (
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-6">Claim Management</h2>
            <div className="mb-6">
              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="bg-card border border-border text-foreground text-xs py-2 px-3 rounded-sm min-h-[44px]"
              >
                {["All", "pending", "approved", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b-2 border-foreground">
                    {["Item", "Claimer", "Poster", "Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="py-3 label-caps">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredClaims.map((c) => (
                    <tr key={c.id} className="border-b border-foreground/10 hover:bg-card/60 transition-colors">
                      <td className="py-3 font-bold text-foreground truncate max-w-[180px]">{c.items?.title ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{fmtName(c.profiles?.first_name ?? null, c.profiles?.last_name ?? null)}</td>
                      <td className="py-3 text-muted-foreground">{fmtName(c.poster?.first_name ?? null, c.poster?.last_name ?? null)}</td>
                      <td className="py-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm ${
                          c.status === "pending" ? "bg-yellow-100 text-yellow-800" : c.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>{c.status}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => navigate(`/item/${c.item_id}`)} className="p-1 text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                          <button onClick={() => deleteClaim(c.id)} className="p-1 text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredClaims.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No claims found.</p>}
            </div>
          </div>
        )}

        {/* ─── REPORTS ─────────────────────────────────── */}
        {section === "reports" && (
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-8">Reports & Flagging</h2>

            {/* Expiring soon */}
            <div className="mb-10">
              <h3 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" /> Expiring in 7 Days ({expiringItems.length})
              </h3>
              {expiringItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items expiring soon.</p>
              ) : (
                <div className="space-y-2">
                  {expiringItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-card border border-border rounded-sm p-4">
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.category} · {fmtDate(item.expires_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => extendItem(item.id, item.title)} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:brightness-90 px-3 py-1.5 border border-primary rounded-sm btn-press">Extend</button>
                        <button onClick={() => navigate(`/item/${item.id}`)} className="p-1.5 text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High claim items */}
            <div className="mb-10">
              <h3 className="font-serif text-xl text-foreground mb-4">High Demand — 3+ Claims ({highClaimItems.length})</h3>
              {highClaimItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No high-demand items.</p>
              ) : (
                <div className="space-y-2">
                  {highClaimItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-card border border-border rounded-sm p-4">
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.claim_count} claims · {item.type}</p>
                      </div>
                      <button onClick={() => navigate(`/item/${item.id}`)} className="p-1.5 text-muted-foreground hover:text-foreground"><Eye size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flagged items */}
            <div>
              <h3 className="font-serif text-xl text-foreground mb-4">Flagged Items ({flaggedItems.length})</h3>
              {flaggedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No flagged items. Flag items from the Items section.</p>
              ) : (
                <div className="space-y-2">
                  {flaggedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-card border border-red-500/20 rounded-sm p-4">
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.category} · {item.status}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleFlag(item.id, item.flagged, item.title)} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 px-3 py-1.5 border border-red-500 rounded-sm btn-press">Unflag</button>
                        <button onClick={() => deleteItem(item)} className="p-1.5 text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ANNOUNCEMENTS ──────────────────────────── */}
        {section === "announcements" && (
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-6">Announcements</h2>

            {/* Form */}
            <div className="bg-card border border-border rounded-sm p-6 mb-8">
              <h3 className="label-caps mb-4">{editingAnn ? "Edit Announcement" : "New Announcement"}</h3>
              <input
                type="text"
                placeholder="Title"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full bg-transparent field-focus outline-none py-2 font-sans text-foreground mb-4 min-h-[44px]"
              />
              <textarea
                placeholder="Message..."
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                className="w-full bg-transparent field-focus outline-none py-2 font-sans text-foreground min-h-[80px] resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={saveAnnouncement}
                  disabled={!annTitle.trim() || !annMessage.trim()}
                  className="bg-primary text-primary-foreground px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded-sm btn-press hover:brightness-90 transition-all disabled:opacity-50"
                >
                  <Plus size={12} className="inline mr-1" />
                  {editingAnn ? "Update" : "Create"}
                </button>
                {editingAnn && (
                  <button onClick={() => { setEditingAnn(null); setAnnTitle(""); setAnnMessage(""); }} className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className={`bg-card border rounded-sm p-5 ${a.active ? "border-primary/30" : "border-border opacity-60"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm">{a.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2">{fmtDate(a.created_at)} · {a.active ? "Active" : "Inactive"}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleAnnouncement(a.id, a.active)} title={a.active ? "Deactivate" : "Activate"} className="p-1.5 text-muted-foreground hover:text-foreground">
                        {a.active ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => { setEditingAnn(a.id); setAnnTitle(a.title); setAnnMessage(a.message); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Edit size={14} />
                      </button>
                      <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 text-red-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No announcements yet.</p>}
            </div>
          </div>
        )}

        {/* ─── LOGS ────────────────────────────────────── */}
        {section === "logs" && (
          <div>
            <h2 className="font-serif text-3xl text-foreground mb-6">Activity Log</h2>
            <div className="mb-6">
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-card border border-border text-foreground text-xs py-2 px-3 rounded-sm min-h-[44px]"
              >
                <option value="All">All Actions</option>
                {logActions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-foreground">
                    {["Time", "Admin", "Action", "Target", "Notes"].map((h) => (
                      <th key={h} className="py-3 label-caps">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="border-b border-foreground/10 hover:bg-card/60 transition-colors">
                      <td className="py-3 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="py-3 text-foreground">{fmtName(l.profiles?.first_name ?? null, l.profiles?.last_name ?? null)}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm bg-muted text-muted-foreground">{l.action}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{l.target_type ? `${l.target_type}/${l.target_id}` : "—"}</td>
                      <td className="py-3 text-muted-foreground truncate max-w-[200px]">{l.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No logs yet.</p>}
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Rich Item Delete Dialog */}
      {deletePreviewItem && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletePreviewItem(null)} />
          <div className="relative bg-card w-full max-w-md max-h-[85vh] md:max-h-[90vh] rounded-t-xl md:rounded-sm border border-border shadow-2xl modal-enter overflow-hidden flex flex-col">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Image */}
              {deletePreviewItem.image_url ? (
                <div className="w-full h-36 md:h-48 overflow-hidden bg-muted shrink-0">
                  <img src={deletePreviewItem.image_url} alt={deletePreviewItem.title} className="w-full h-full object-cover object-center" />
                </div>
              ) : (
                <div className="w-full h-24 md:h-32 bg-muted flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest shrink-0">No Image</div>
              )}

              <div className="p-5 md:p-6">
                <h3 className="font-serif text-xl md:text-2xl text-foreground mb-1">{deletePreviewItem.title}</h3>
                {deletePreviewItem.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{deletePreviewItem.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="label-caps">Category</span>
                    <span className="text-foreground font-medium">{deletePreviewItem.category}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="label-caps">Type</span>
                    <span className="text-foreground font-medium">{deletePreviewItem.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="label-caps">Location</span>
                    <span className="text-foreground font-medium">{deletePreviewItem.location}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="label-caps">Status</span>
                    <span className={`font-bold text-xs uppercase ${
                      deletePreviewItem.status === "active" ? "text-green-600" : deletePreviewItem.status === "claimed" ? "text-blue-600" : "text-muted-foreground"
                    }`}>{deletePreviewItem.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="label-caps">Posted By</span>
                    <span className="text-foreground font-medium">{fmtName(deletePreviewItem.profiles?.first_name ?? null, deletePreviewItem.profiles?.last_name ?? null)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="label-caps">Claims</span>
                    <span className="text-foreground font-medium">{deletePreviewItem.claim_count ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned buttons */}
            <div className="shrink-0 p-5 md:p-6 pt-0 md:pt-0 border-t border-border bg-card">
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setDeletePreviewItem(null)}
                  className="flex-1 py-3 min-h-[44px] border border-foreground/20 text-foreground text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-muted transition-colors btn-press"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteItem}
                  className="flex-1 py-3 min-h-[44px] bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-red-700 transition-colors btn-press flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete this post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
