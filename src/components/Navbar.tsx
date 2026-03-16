import { NavLink as RouterNavLink, Link } from "react-router-dom";

const Navbar = () => (
  <nav className="bg-secondary text-secondary-foreground py-6 px-8 flex justify-between items-center sticky top-0 z-50">
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
    <Link to="/profile" className="w-8 h-8 bg-amber rounded-sm flex items-center justify-center text-secondary font-bold text-xs hover:brightness-110 transition-all">
      JD
    </Link>
  </nav>
);

export default Navbar;
