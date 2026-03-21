import { NavLink as RouterNavLink, Link, useLocation } from "react-router-dom";
import { Home, PlusSquare, List, User, Bell, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const Navbar = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('theme') !== 'light'
  );

  const handleThemeToggle = (checked: boolean) => {
    setIsDark(checked);
    document.documentElement.classList.toggle('dark', checked);
    localStorage.setItem('theme', checked ? 'dark' : 'light');
  };

  useEffect(() => {
    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (count !== null) setUnreadCount(count);
    };

    fetchUnread();
    
    // Fetch unread messages (received and unread)
    const fetchUnreadMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', user.id)
        .eq('read', false);
      setHasUnreadMessages((count ?? 0) > 0);
    };

    fetchUnreadMessages();

    // Subscribe to changes in notifications for current user
    const channel = supabase
      .channel('navbar-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnread();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchUnreadMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [location]);

  return (
  <>
    <nav className="bg-secondary text-secondary-foreground py-6 px-6 md:px-8 flex justify-between items-center sticky top-0 z-50">
      <Link to="/feed" className="font-serif text-2xl tracking-tight">
        FindMyStuff
      </Link>
      <div className="hidden md:flex gap-10 items-center nav-link">
        <RouterNavLink
          to="/feed"
          className={({ isActive }) =>
            isActive ? "text-amber" : "text-secondary-foreground/70 hover:text-amber transition-colors duration-200"
          }
        >
          Browse
        </RouterNavLink>
        <RouterNavLink
          to="/post"
          className={({ isActive }) =>
            isActive ? "text-amber" : "text-secondary-foreground/70 hover:text-amber transition-colors duration-200"
          }
        >
          Post Item
        </RouterNavLink>
        <RouterNavLink
          to="/my-posts"
          className={({ isActive }) =>
            isActive ? "text-amber" : "text-secondary-foreground/70 hover:text-amber transition-colors duration-200"
          }
        >
          My Posts
        </RouterNavLink>
        <RouterNavLink
          to="/chats"
          className={({ isActive }) =>
            isActive ? "text-amber" : "text-secondary-foreground/70 hover:text-amber transition-colors duration-200"
          }
        >
          <span className="relative">
            Messages
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </span>
        </RouterNavLink>
      </div>
      <div className="flex items-center gap-4 overflow-visible">
        <Link 
          to="/notifications" 
          className={`relative p-2 rounded-full transition-colors ${location.pathname === '/notifications' ? 'text-amber' : 'text-secondary-foreground/70 hover:text-amber'}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-secondary" />
          )}
        </Link>
        <label className="switch hidden md:inline-block align-middle">
          <input 
            type="checkbox" 
            checked={isDark}
            onChange={(e) => handleThemeToggle(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
        <Link to="/profile" className="hidden md:flex w-8 h-8 bg-amber rounded-sm items-center justify-center text-secondary font-bold text-xs hover:brightness-110 transition-all">
          JD
        </Link>
      </div>
    </nav>
    
    {/* Mobile Bottom Tab Bar */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[hsl(var(--navy))] flex justify-around items-center h-16 z-50 border-t border-background/10">
      <Link
        to="/feed"
        className={`flex flex-col items-center gap-1 ${location.pathname === '/feed' ? "text-primary" : "text-secondary-foreground/60"}`}
      >
        <Home size={20} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
      </Link>
      <Link
        to="/post"
        className={`flex flex-col items-center gap-1 ${location.pathname === '/post' ? "text-primary" : "text-secondary-foreground/60"}`}
      >
        <PlusSquare size={20} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Post</span>
      </Link>
      <Link
        to="/my-posts"
        className={`flex flex-col items-center gap-1 ${location.pathname === '/my-posts' ? "text-primary" : "text-secondary-foreground/60"}`}
      >
        <List size={20} />
        <span className="text-[10px] font-bold uppercase tracking-wider">My Posts</span>
      </Link>
      <Link
        to="/chats"
        className={`flex flex-col items-center gap-1 relative ${location.pathname === '/chats' ? "text-primary" : "text-secondary-foreground/60"}`}
      >
        <MessageSquare size={20} />
        {hasUnreadMessages && (
          <span className="absolute top-0 right-1/4 w-2 h-2 bg-red-500 rounded-full" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider">Messages</span>
      </Link>

      <Link
        to="/profile"
        className={`flex flex-col items-center gap-1 ${location.pathname === '/profile' ? "text-primary" : "text-secondary-foreground/60"}`}
      >
        <User size={20} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
      </Link>
    </div>
  </>
  );
};

export default Navbar;
