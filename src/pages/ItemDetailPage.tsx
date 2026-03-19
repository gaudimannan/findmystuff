import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";

interface Item {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  type: string;
  image_url: string | null;
  created_at: string;
  expires_at: string;
  status: string;
  user_id: string;
}

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [claimCount, setClaimCount] = useState(0);
  const [firstClaimantId, setFirstClaimantId] = useState<string | null>(null);
  const [userHasClaim, setUserHasClaim] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(false);

      if (!id) {
        setError(true);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
        
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setCurrentUserId(userData.user.id);
      }

      if (fetchError || !data) {
        console.error("Error fetching item:", fetchError);
        setError(true);
      } else {
        setItem(data as Item);

        // Fetch claim info for messaging
        const { data: claimsData, count } = await supabase
          .from('claims')
          .select('claimant_id', { count: 'exact' })
          .eq('item_id', id)
          .order('created_at', { ascending: true });

        if (count) setClaimCount(count);
        if (claimsData && claimsData.length > 0) {
          setFirstClaimantId(claimsData[0].claimant_id);
        }

        // Check if current user has a claim
        if (userData?.user) {
          const { data: userClaim } = await supabase
            .from('claims')
            .select('id')
            .eq('item_id', id)
            .eq('claimant_id', userData.user.id)
            .maybeSingle();
          
          if (userClaim) {
            setUserHasClaim(true);
          }
        }
      }
      
      setLoading(false);
    };

    fetchItem();
  }, [id]);

  const handleClaim = async () => {
    if (!item) return;
    
    setClaimLoading(true);
    setClaimError("");
    setClaimSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setClaimError("You must be logged in to claim an item.");
      setClaimLoading(false);
      return;
    }

    const { data: newClaim, error: claimError } = await supabase.from('claims').insert({
      item_id: item.id,
      claimant_id: user.id,
      status: 'pending'
    }).select().single();

    if (claimError) {
      setClaimError(claimError.message);
      setClaimLoading(false);
      return;
    }

    // Notify the poster
    await supabase.from('notifications').insert({
      user_id: item.user_id,
      type: 'claim',
      item_id: item.id,
      claim_id: newClaim.id,
      from_user_id: user.id,
      read: false
    });

    const { error: updateError } = await supabase
      .from('items')
      .update({ status: 'claimed' })
      .eq('id', item.id);

    if (updateError) {
      setClaimError(updateError.message);
    } else {
      setClaimSuccess(true);
      setUserHasClaim(true);
      setItem({ ...item, status: 'claimed' });
    }
    
    setClaimLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background page-enter">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-20 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background page-enter">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-20 text-center">
          <p className="text-muted-foreground">Item not found.</p>
        </main>
      </div>
    );
  }

  const details = [
    { label: "Category", value: item.category },
    { label: "Location", value: item.location },
    { label: "Status", value: item.status },
    { label: "Date Posted", value: new Date(item.created_at).toLocaleDateString() },
    { label: "Expires", value: new Date(item.expires_at).toLocaleDateString() },
  ];

  return (
    <div className="min-h-screen bg-background page-enter">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
          <div className="bg-secondary aspect-square flex items-center justify-center text-secondary-foreground/10 uppercase tracking-[0.3em] text-sm rounded-sm overflow-hidden">
            {item.image_url ? (
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              "Primary Image"
            )}
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-amber font-bold text-xs uppercase tracking-[0.3em] mb-4">
              {item.type} Item
            </span>
            <h1 className="font-serif text-4xl md:text-6xl text-foreground mb-6 leading-tight">
              {item.title}
            </h1>
            
            {item.description && (
              <p className="font-sans text-foreground/80 mb-10 leading-relaxed">
                {item.description}
              </p>
            )}

            <div className="space-y-5 mb-12 border-t border-foreground/10 pt-8">
              {details.map((row) => (
                <div key={row.label} className="flex justify-between items-baseline border-b border-foreground/5 pb-3">
                  <span className="label-caps">{row.label}</span>
                  <span className="font-sans text-foreground font-medium text-sm">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              {item.status.toLowerCase() === 'claimed' && !userHasClaim && currentUserId !== item.user_id ? (
                <p className="w-full text-center py-4 text-muted-foreground text-sm font-medium">
                  This item has been claimed.
                </p>
              ) : currentUserId !== item.user_id ? (
                <div className="w-full flex flex-col gap-4">
                  {!userHasClaim ? (
                    <button 
                      onClick={handleClaim}
                      disabled={claimLoading}
                      className="w-full py-4 border-2 border-foreground text-foreground font-bold uppercase tracking-wider text-xs hover:bg-secondary hover:text-secondary-foreground transition-colors duration-200 rounded-sm btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claimLoading ? "Submitting..." : "Claim This Item"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        if (!item?.id || !item.user_id) return;
                        console.log('navigating to chat with:', item.id, item.user_id);
                        navigate(`/chat/${item.id}/${item.user_id}`);
                      }}
                      className="w-full py-4 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-xs hover:brightness-90 transition-all duration-200 rounded-sm btn-press"
                    >
                      Message Poster
                    </button>
                  )}
                  {claimSuccess && (
                    <p className="text-sm mt-2 text-center text-green-600 font-medium">Claim submitted! You can now message the poster.</p>
                  )}
                  {claimError && (
                    <p className="text-red-500 text-sm mt-2 text-center">{claimError}</p>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  {claimCount > 0 ? (
                    <button
                      onClick={() => {
                        if (!item?.id || !firstClaimantId) return;
                        console.log('navigating to chat with:', item.id, firstClaimantId);
                        navigate(`/chat/${item.id}/${firstClaimantId}`);
                      }}
                      className="w-full py-4 border-2 border-[hsl(var(--navy))] text-[hsl(var(--navy))] font-bold uppercase tracking-wider text-xs hover:bg-[hsl(var(--navy))] hover:text-white transition-colors duration-200 rounded-sm btn-press"
                    >
                      View Messages
                    </button>
                  ) : (
                    <p className="w-full text-center py-4 text-muted-foreground text-sm font-medium">
                      Wait for a claim to message the person.
                    </p>
                  )}
                </div>
              )}
              
              <button className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground self-center transition-colors duration-200">
                Bump Post
              </button>
            </div>

            <button className="mt-20 text-[10px] uppercase tracking-widest font-bold text-destructive/50 hover:text-destructive text-left transition-colors duration-200">
              Report this post
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetailPage;
