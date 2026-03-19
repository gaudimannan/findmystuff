import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";
import { CheckCheck, Bell } from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  item_id: string;
  claim_id: string;
  from_user_id: string;
  read: boolean;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  items: {
    title: string;
  } | null;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from('notifications')
        .select('*, profiles:from_user_id(first_name, last_name), items:item_id(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setNotifications(data as unknown as Notification[]);
      setLoading(false);
    };

    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUserId)
      .eq('read', false);
    
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notif.id);
    }
    
    // Navigate to chat
    navigate(`/chat/${notif.item_id}/${notif.from_user_id}`);
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getInitials = (first: string | null, last: string | null) => {
    return `${(first || "?").charAt(0)}${(last || "?").charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 pb-24 md:pb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-serif text-3xl text-foreground">Notifications</h1>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:brightness-90 transition-all"
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm uppercase tracking-widest animate-pulse">Fetching updates...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-6">
              <Bell size={24} />
            </div>
            <p className="text-muted-foreground text-sm font-medium tracking-wide">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const senderName = `${notif.profiles?.first_name || 'Someone'} ${notif.profiles?.last_name || ''}`.trim();
              const initials = getInitials(notif.profiles?.first_name || null, notif.profiles?.last_name || null);
              
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-center gap-4 bg-secondary p-5 rounded-sm border transition-all cursor-pointer ${
                    notif.read 
                      ? "border-transparent opacity-70" 
                      : "border-primary/10 border-l-primary border-l-4 shadow-sm"
                  } hover:bg-secondary/80`}
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-[hsl(var(--navy))] flex items-center justify-center text-amber text-xs font-bold border border-foreground/5">
                    {initials}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans text-secondary-foreground leading-snug">
                      <span className="font-bold">{senderName}</span> claimed your item <span className="italic">"{notif.items?.title}"</span>
                    </p>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-1">
                      {getTimeAgo(notif.created_at)}
                    </span>
                  </div>
                  
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
