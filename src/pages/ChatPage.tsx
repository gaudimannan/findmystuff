import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Send, X } from "lucide-react";

interface Message {
  id: number | string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Item {
  id: number;
  title: string;
  user_id: string;
  status: string;
}

const ChatPage = () => {
  const { itemId, otherUserId } = useParams<{ itemId: string; otherUserId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !itemId || !otherUserId) return;
      setCurrentUserId(user.id);

      // Fetch item
      const { data: itemData } = await supabase
        .from('items')
        .select('id, title, user_id, status')
        .eq('id', itemId)
        .single();
      if (itemData) setItem(itemData);

      // Fetch other user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();
      if (profileData) setOtherUser(profileData);

      // Fetch claim status
      // If current user is poster, other is claimant. If current user is claimant, they are claimant.
      const claimantId = itemData?.user_id === user.id ? otherUserId : user.id;
      const { data: claimData } = await supabase
        .from('claims')
        .select('status')
        .eq('item_id', itemId)
        .eq('claimant_id', claimantId)
        .maybeSingle();
      if (claimData) setClaimStatus(claimData.status);

      // Fetch messages
      console.log('itemId from params:', itemId)
      const { data: msgs, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      console.log('fetched messages:', msgs, 'error:', fetchError)
      if (msgs) setMessages(msgs as Message[]);
      setLoading(false);

      // Real-time subscription
      const channel = supabase
        .channel(`chat-${itemId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `item_id=eq.${itemId}`,
          },
          async (payload) => {
            console.log('realtime message received:', payload)
            const newMsg = payload.new as any;

            // fetch full message with profile data since payload.new won't include joins
            const { data: fullMsg } = await supabase
              .from('messages')
              .select('*, profiles:sender_id(first_name, last_name)')
              .eq('id', newMsg.id)
              .single();

            if (fullMsg) {
              setMessages(prev => {
                if (prev.find(m => m.id === fullMsg.id)) return prev;
                return [...prev, fullMsg];
              });
            }
          }
        )
        .subscribe();

      console.log('subscribed to channel:', `chat-${itemId}`)

      return () => {
        supabase.removeChannel(channel);
      };
    };

    init();
  }, [itemId, otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || !itemId || !otherUserId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    console.log('sending:', content, 'from:', currentUserId, 'to:', otherUserId, 'item:', itemId)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        item_id: itemId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: newMessage.trim()
      })
      .select()
      .single();
    console.log('message sent, data:', data, 'error:', error)

    if (!error) {
      // Optimistically add message to state immediately
      setMessages(prev => [...prev, {
        id: Date.now(),
        content,
        sender_id: currentUserId,
        receiver_id: otherUserId!,
        item_id: Number(itemId),
        created_at: new Date().toISOString(),
      } as any]);
    }

    setSending(false);
  };

  const handleAccept = async () => {
    if (!item || !otherUserId) return;
    const claimantId = otherUserId; // In this context, poster is current user

    await supabase.from('claims')
      .update({ status: 'approved' })
      .eq('item_id', item.id)
      .eq('claimant_id', claimantId);

    await supabase.from('items')
      .update({ status: 'claimed' })
      .eq('id', item.id);

    setClaimStatus('approved');
  };

  const handleReject = async () => {
    if (!item || !otherUserId) return;
    const claimantId = otherUserId;

    await supabase.from('claims')
      .update({ status: 'rejected' })
      .eq('item_id', item.id)
      .eq('claimant_id', claimantId);

    setClaimStatus('rejected');
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const otherInitials = `${getInitials(otherUser?.first_name)}${getInitials(otherUser?.last_name)}`;
  const isPoster = item?.user_id === currentUserId;

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm uppercase tracking-widest">Loading Conversation...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />
      
      {/* Header */}
      <div className="bg-secondary border-b border-foreground/10 px-4 md:px-8 py-3 flex items-center justify-between sticky top-[73px] z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={22} />
          </button>
          
          <div 
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--navy))] flex items-center justify-center text-amber text-sm font-bold border border-foreground/10 group-hover:brightness-110">
              {otherInitials}
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground leading-tight">
                {otherUser?.first_name} {otherUser?.last_name}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {item?.title}
              </p>
            </div>
          </div>
        </div>

        {isPoster && claimStatus === 'pending' && (
          <div className="flex gap-2">
            <button 
              onClick={handleAccept}
              className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm hover:brightness-90 transition-all btn-press"
            >
              Accept
            </button>
            <button 
              onClick={handleReject}
              className="border border-red-500 text-red-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm hover:bg-red-500 hover:text-white transition-all btn-press"
            >
              Reject
            </button>
          </div>
        )}

        {claimStatus === 'approved' && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-sm">
            Claim Accepted
          </span>
        )}
        
        {claimStatus === 'rejected' && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1 rounded-sm">
            Claim Rejected
          </span>
        )}
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 space-y-4 max-w-4xl w-full mx-auto">
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              {!isOwn && (
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1 ml-1">
                  {otherUser?.first_name}
                </span>
              )}
              <div
                className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 text-sm leading-relaxed ${
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-tl-lg rounded-bl-lg rounded-tr-sm"
                    : "bg-[hsl(var(--navy))] text-white rounded-tr-lg rounded-br-lg rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1 px-1">
                {formatTime(msg.created_at)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-foreground/10 px-4 md:px-8 py-4 z-40">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Write a message..."
            className="flex-1 bg-background text-foreground placeholder:text-muted-foreground border-b border-foreground/10 focus:border-primary outline-none py-2 text-sm transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="bg-primary text-primary-foreground px-4 py-2 text-[10px] uppercase tracking-widest font-bold rounded-sm btn-press hover:brightness-90 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Send size={12} />
            Send
          </button>
        </div>
      </div>

      {/* Profile Popup */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowProfile(false)}
          />
          <div className="relative bg-secondary w-full max-w-xs p-8 rounded-sm border border-foreground/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[hsl(var(--navy))] flex items-center justify-center text-amber text-3xl font-bold mb-4 shadow-lg border border-foreground/10">
                {otherInitials}
              </div>
              <h3 className="font-serif text-2xl text-foreground mb-6">
                {otherUser?.first_name} {otherUser?.last_name}
              </h3>
              
              <div className="w-full space-y-4 pt-4 border-t border-foreground/5">
                <div className="flex flex-col items-start">
                  <span className="text-[9px] label-caps text-muted-foreground mb-1">Email</span>
                  <span className="text-sm font-medium">{otherUser?.email ?? 'Not available'}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] label-caps text-muted-foreground mb-1">Phone</span>
                  <span className="text-sm font-medium">{otherUser?.phone ?? 'Not available'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
