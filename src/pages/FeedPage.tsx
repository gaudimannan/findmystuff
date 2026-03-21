import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";

const categories = ["All", "Keys", "ID Card", "Laptop", "Earbuds", "Bag", "Charger", "Other"];

interface Item {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  days: number;
  type: string;
  image_url: string | null;
  expires_at: string;
}

const FeedPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"Lost" | "Found">("Lost");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(false);
      
      const { data, error } = await supabase.from('items').select('*');
      
      if (error) {
        console.error("Error fetching items:", error);
        setError(true);
      } else if (data) {
        setItems(data as Item[]);
      }
      
      setLoading(false);
    };

    fetchItems();
  }, []);

  const filtered = items.filter(
    (item) =>
      (filter === "All" || item.category === filter) &&
      item.type === typeFilter &&
      (searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background page-enter">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        {/* Search Bar */}
        <div className="mb-8 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-transparent border border-foreground/20 rounded-sm text-sm text-foreground placeholder:text-muted-foreground field-focus outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-foreground/10 pb-8 gap-6">
          {/* Lost / Found toggle — chip selection animation */}
          <div className="flex gap-2">
            {(["Lost", "Found"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-sm transition-[background-color,color] duration-100 ${
                  typeFilter === t
                    ? "bg-secondary text-secondary-foreground"
                    : "border border-foreground/20 text-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Category chips — fill transition */}
          <div className="flex gap-4 overflow-x-auto pb-2 w-full md:w-auto hide-scrollbar snap-x">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-[11px] uppercase tracking-widest whitespace-nowrap transition-[color] duration-100 ${
                  filter === cat ? "text-amber font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">Could not load items.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">
              {searchQuery ? `No items found for "${searchQuery}"` : "No items match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20 md:pb-0">
            {filtered.map((item, i) => {
              const daysLeft = Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              
              return (
                <Link to={`/item/${item.id}`} key={item.id} className={`group card-stagger-${i}`}>
                  <div className="bg-secondary border border-muted-foreground/20 rounded-sm transition-all duration-200 hover:border-secondary overflow-hidden">
                    <div className="aspect-[3/2] md:aspect-[4/3] max-h-48 md:max-h-none bg-secondary-foreground/5 flex items-center justify-center text-secondary-foreground/20 uppercase tracking-widest text-[10px] overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        "No Image"
                      )}
                    </div>
                    <div className="p-5">
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5 rounded-sm transition-[background-color,color] duration-[120ms] text-amber group-hover:bg-secondary-foreground group-hover:text-secondary">
                        {item.category}
                      </span>
                      <h3 className="font-serif text-xl text-secondary-foreground mt-1 transition-colors duration-[120ms]">
                        {item.title}
                      </h3>
                      <div className="flex justify-between items-center mt-5">
                        <span className="text-[10px] text-secondary-foreground/60 uppercase flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            daysLeft <= 0 
                              ? "text-red-500" 
                              : daysLeft < 7 
                                ? "text-red-400 pulse-once" 
                                : "text-secondary-foreground/40"
                          }`}
                        >
                          {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default FeedPage;
