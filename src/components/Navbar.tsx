import { NavLink as RouterNavLink, Link, useLocation } from "react-router-dom";
import { Home, PlusSquare, List, User } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

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
      </div>
      <Link to="/profile" className="hidden md:flex w-8 h-8 bg-amber rounded-sm items-center justify-center text-secondary font-bold text-xs hover:brightness-110 transition-all">
        JD
      </Link>
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
