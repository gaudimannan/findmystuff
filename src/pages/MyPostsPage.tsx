import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";

interface Item {
  id: number;
  title: string;
  category: string;
  type: string;
  status: string;
  expires_at: string;
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

  useEffect(() => {
    const fetchMyPosts = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (data) {
          setPosts(data as Item[]);
        }
      }
      
      setLoading(false);
    };

    fetchMyPosts();
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    
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

                  return (
                    <tr
                      key={post.id}
                      className="border-b border-foreground/10 hover:bg-card/60 transition-colors duration-200"
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
                        <div className="flex gap-4 items-center">
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
