import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";
import { MessageSquare } from "lucide-react";

interface ConversationRow {
  id: number;
  item_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender: { first_name: string | null; last_name: string | null } | null;
  receiver: { first_name: string | null; last_name: string | null } | null;
  items: { title: string } | null;
}

interface Conversation {
  key: string;       // `${item_id}-${otherUserId}`
  itemId: string;
  otherUserId: string;
  otherName: string;
  itemTitle: string;
  lastMessage: string;
  lastAt: string;
  isUnread: boolean;
}

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

const ChatsPage = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("messages")
        .select(
          "*, sender:sender_id(first_name, last_name), receiver:receiver_id(first_name, last_name), items(title)"
        )
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("chats fetch error:", error);
        setLoading(false);
        return;
      }

      // Deduplicate: keep one entry per (item_id + other user)
      const seen = new Set<string>();
      const convos: Conversation[] = [];

      for (const row of (data ?? []) as ConversationRow[]) {
        const otherUserId =
          row.sender_id === user.id ? row.receiver_id : row.sender_id;
        const key = `${row.item_id ?? 'no-item'}-${otherUserId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const otherProfile =
          row.sender_id === user.id ? row.receiver : row.sender;
        const otherName =
          `${otherProfile?.first_name ?? ""} ${otherProfile?.last_name ?? ""}`.trim() ||
          "Unknown";

        // A conversation is unread if the latest message was received by current user and not read
        const isUnread = row.receiver_id === user.id && !row.read;

        convos.push({
          key,
          itemId: row.item_id ?? (row.items as any)?.id ?? null,
          otherUserId,
          otherName,
          itemTitle: row.items?.title ?? "Item",
          lastMessage: row.content,
          lastAt: row.created_at,
          isUnread,
        });
      }

      // Sort unread conversations to the top
      convos.sort((a, b) => {
        if (a.isUnread && !b.isUnread) return -1;
        if (!a.isUnread && b.isUnread) return 1;
        return 0;
      });

      console.log('conversations:', convos)
      convos.forEach(c => console.log('conv itemId:', c.itemId, 'otherUserId:', c.otherUserId))
      setConversations(convos);
      setLoading(false);

      // Mark all received messages as read now that user has opened the inbox
      const { error: markError } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      console.log('mark as read error:', markError)
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans page-enter">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 md:px-8 py-12 pb-28 md:pb-12">
        <h1 className="font-serif text-4xl text-foreground mb-8">Messages</h1>

        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-20 uppercase tracking-widest animate-pulse">
            Loading...
          </p>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-6">
              <MessageSquare size={24} />
            </div>
            <p className="text-muted-foreground text-sm font-medium tracking-wide">
              No messages yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations
              .filter((convo) => convo.itemId && convo.otherUserId)
              .map((convo, i, arr) => (
              <div key={convo.key}>
                <button
                  onClick={() =>
                    navigate(`/chat/${convo.itemId}/${convo.otherUserId}`)
                  }
                  className={`w-full flex items-center gap-4 py-4 transition-colors duration-150 text-left rounded-sm px-2 ${
                    convo.isUnread ? "bg-muted hover:bg-muted/80" : "hover:bg-secondary/40"
                  }`}
                >
                  {/* Avatar */}
                  <div className="shrink-0 w-12 h-12 rounded-full bg-[hsl(var(--navy))] flex items-center justify-center text-amber text-sm font-bold border border-foreground/5">
                    {initials(convo.otherName)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-sm text-foreground truncate ${convo.isUnread ? "font-extrabold" : "font-bold"}`}>
                        {convo.otherName}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground uppercase tracking-wider">
                        {timeAgo(convo.lastAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1 truncate">
                      {convo.itemTitle}
                    </p>
                    <p className={`text-sm truncate leading-snug ${convo.isUnread ? "text-foreground font-semibold" : "text-foreground/70"}`}>
                      {convo.lastMessage}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {convo.isUnread && (
                    <div className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
                {i < arr.length - 1 && (
                  <div className="border-b border-foreground/5 mx-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatsPage;
