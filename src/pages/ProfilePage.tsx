import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData);
        }

        const { count } = await supabase
          .from('items')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);
          
        if (count !== null) {
          setPostCount(count);
        }
      }
      
      setLoading(false);
    };

    fetchProfileData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-sans flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pb-20">
          <p className="text-muted-foreground text-sm uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  const initials = [
    profile?.first_name?.charAt(0) ?? '',
    profile?.last_name?.charAt(0) ?? ''
  ].join('').toUpperCase() || '?';
    
  const fullName = (profile?.first_name || profile?.last_name) 
    ? `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() 
    : "No name set";

  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'long', 
        year: 'numeric'
      })
    : "Unknown";

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col page-enter">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
        <div className="w-full max-w-md bg-card border border-border p-6 md:p-12 rounded-sm relative shadow-sm">
          
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-4xl font-bold mx-auto mb-6 shadow-md border-4 border-background">
            {initials}
          </div>
          
          {/* Full Name */}
          <h1 className="font-serif text-3xl text-foreground text-center mb-10 tracking-tight">
            {fullName}
          </h1>
          
          {/* Details */}
          <div className="space-y-5 mb-12">
            <div className="flex justify-between items-baseline border-b border-border pb-3">
              <span className="label-caps">EMAIL</span>
              <span className="font-sans text-foreground font-medium text-sm">{profile?.email ?? 'No email'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-border pb-3">
              <span className="label-caps">PHONE</span>
              <span className="font-sans text-foreground font-medium text-sm">{profile?.phone ?? 'Not provided'}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-border pb-3">
              <span className="label-caps">MEMBER SINCE</span>
              <span className="font-sans text-foreground font-medium text-sm">{memberSince}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-border pb-3">
              <span className="label-caps">POSTS</span>
              <span className="font-sans text-foreground font-medium text-sm">{postCount}</span>
            </div>
          </div>
          
          {/* Sign Out Button */}
          <button 
            onClick={handleSignOut}
            className="w-full py-4 border-2 border-primary text-primary font-bold uppercase tracking-wider text-xs hover:bg-primary hover:text-primary-foreground transition-colors duration-200 rounded-sm btn-press"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
