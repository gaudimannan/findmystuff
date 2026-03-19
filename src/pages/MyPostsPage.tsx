import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";

interface Item {
  id: number;
  title: string;
  category: string;
  type: string;
  status: string;
  expires_at: string;
  pending_claims_count?: number;
}

interface ClaimProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Claim {
  id: number;
  item_id: number;
  claimant_id: string;
  status: string;
  profiles: ClaimProfile;
}

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  claimed: "bg-blue-100 text-blue-800",
  expired: "bg-muted text-muted-foreground opacity-60",
};

const MyPostsPage = () => {
  const [posts, setPosts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [itemClaims, setItemClaims] = useState<Record<number, Claim[]>>({});
  const [claimsLoading, setClaimsLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (itemsData) {
        // Fetch claim counts for active items
        const postsWithCounts = await Promise.all(
          itemsData.map(async (item: any) => {
            if (item.status === 'active') {
              const { count } = await supabase
                .from('claims')
                .select('*', { count: 'exact', head: true })
                .eq('item_id', item.id)
                .eq('status', 'pending');
              return { ...item, pending_claims_count: count || 0 };
            }
            return { ...item, pending_claims_count: 0 };
          })
        );
        setPosts(postsWithCounts as Item[]);
      }
    }
    
    setLoading(false);
  };

  const fetchClaimsForItem = async (itemId: number) => {
    setClaimsLoading(prev => ({ ...prev, [itemId]: true }));
    
    const { data: claimsData } = await supabase
      .from('claims')
      .select('*, profiles(id, first_name, last_name, email, phone)')
      .eq('item_id', itemId)
      .eq('status', 'pending');

    if (claimsData) {
      setItemClaims(prev => ({ ...prev, [itemId]: claimsData as any }));
    }
    
    setClaimsLoading(prev => ({ ...prev, [itemId]: false }));
  };

  const toggleExpandClaims = (itemId: number) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(itemId);
      fetchClaimsForItem(itemId);
    }
  };

  const handleApproveClaim = async (claimId: number, itemId: number) => {
    // Update claim status
    await supabase.from('claims').update({ status: 'approved' }).eq('id', claimId);
    
    // Update item status
    await supabase.from('items').update({ status: 'claimed' }).eq('id', itemId);
    
    // Refresh to reflect the changes cleanly
    fetchMyPosts();
    setExpandedItemId(null);
  };

  const handleRejectClaim = async (claimId: number, itemId: number) => {
    await supabase.from('claims').update({ status: 'rejected' }).eq('id', claimId);
    // Refresh just this item's claims to show remaining pool if any
    fetchClaimsForItem(itemId);
    
    // Update the parent counter cleanly by running a silent refresh
    const { count } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .eq('status', 'pending');
    
    setPosts(posts.map(post => 
      post.id === itemId ? { ...post, pending_claims_count: count || 0 } : post
    ));
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    
    // Also delete any claims/notifications/messages related to this item
    // Supabase cascade delete should handle this if configured, but we'll stick to item delete
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (!error) {
      setPosts(posts.filter(post => post.id !== id));
    } else {
      console.error("Failed to delete item:", error);
    }
    
    setDeletingId(null);
  };

  const navigate = useNavigate(); // Added useNavigate hook if not imported


  const hasPosts = posts.length > 0;

  return (
    <div className="min-h-screen bg-background page-enter">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-20">
        <h1 className="font-serif text-4xl text-foreground mb-12">My Posts</h1>

        {loading ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        ) : !hasPosts ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              You haven't posted anything yet. Found or lost something?
            </p>
            <Link
              to="/post"
              className="text-amber font-bold text-xs uppercase tracking-widest hover:underline"
            >
              Post an Item →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-foreground">
                  {["Item", "Category", "Type", "Status", "Days Left", "Actions"].map((h) => (
                    <th key={h} className="py-4 label-caps">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-sans text-sm">
                {posts.map((post) => {
                  const daysLeft = Math.ceil((new Date(post.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft <= 0;
                  const displayStatus = post.status.toLowerCase();
                  const badgeStyle = statusStyles[displayStatus] || statusStyles.expired;
                  const isDeleting = deletingId === post.id;
                  const isExpanded = expandedItemId === post.id;
                  const claims = itemClaims[post.id] || [];
                  const isLoadingClaims = claimsLoading[post.id];

                  return (
                    <React.Fragment key={post.id}>
                      <tr
                        className={`border-b border-foreground/10 hover:bg-card/60 transition-colors duration-200 ${isExpanded ? "bg-card/40" : ""}`}
                      >
                        <td className="py-5 font-bold text-foreground">{post.title}</td>
                        <td className="py-5 text-muted-foreground">{post.category}</td>
                        <td className="py-5 text-muted-foreground font-medium">{post.type}</td>
                        <td className="py-5">
                          <span
                            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-sm ${badgeStyle}`}
                          >
                            {post.status}
                          </span>
                        </td>
                        <td className="py-5 text-muted-foreground">
                          {isExpired ? "0 d" : `${daysLeft} d`}
                        </td>
                        <td className="py-5">
                          <div className="flex gap-3 items-center">
                            {displayStatus === 'active' && (
                              <button 
                                onClick={() => toggleExpandClaims(post.id)}
                                className={`text-xs px-3 py-1 rounded transition-colors uppercase tracking-wider font-bold ${
                                  post.pending_claims_count && post.pending_claims_count > 0 
                                    ? "bg-transparent border border-[hsl(var(--navy))] text-[hsl(var(--navy))] hover:bg-[hsl(var(--navy))/0.05]" 
                                    : "bg-transparent border border-muted-foreground text-muted-foreground opacity-50 cursor-not-allowed"
                                }`}
                                disabled={!post.pending_claims_count || post.pending_claims_count === 0}
                              >
                                View Chats ({post.pending_claims_count || 0})
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(post.id)}
                              disabled={isDeleting}
                              className="bg-transparent border border-red-500 text-red-500 text-xs px-3 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-bold"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-card/40 border-b border-foreground/10">
                          <td colSpan={6} className="py-4 px-6 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--navy))]"></div>
                            <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Pending Claims</h4>
                            {isLoadingClaims ? (
                              <p className="text-sm text-muted-foreground">Loading claims...</p>
                            ) : claims.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No pending claims.</p>
                            ) : (
                             <div className="space-y-4">
                                {claims.map(claim => (
                                  <div key={claim.id} className="flex items-center justify-between bg-background p-4 rounded border border-foreground/5 shadow-sm">
                                    <div className="flex-1">
                                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Claimant</p>
                                      <p className="font-bold">{claim.profiles?.first_name ?? 'Unknown'} {claim.profiles?.last_name ?? ''}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => navigate(`/chat/${post.id}/${claim.claimant_id}`)}
                                        className="bg-[hsl(var(--navy))] text-white hover:brightness-110 text-xs px-4 py-2 rounded-sm transition-all uppercase tracking-wider font-bold btn-press"
                                      >
                                        Chat to Verify
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPostsPage;
