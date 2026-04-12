import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
  is_admin: boolean;
  show_email: boolean;
  show_phone: boolean;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editShowEmail, setEditShowEmail] = useState(true);
  const [editShowPhone, setEditShowPhone] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
          setEditFirstName(profileData.first_name || "");
          setEditLastName(profileData.last_name || "");
          setEditPhone(profileData.phone || "");
          setEditShowEmail(profileData.show_email ?? true);
          setEditShowPhone(profileData.show_phone ?? true);
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

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        email: user.email,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone: editPhone.trim(),
        show_email: editShowEmail,
        show_phone: editShowPhone,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, first_name: updates.first_name, last_name: updates.last_name, phone: updates.phone, show_email: updates.show_email, show_phone: updates.show_phone } : null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. " + (error instanceof Error ? error.message : JSON.stringify(error)));
    } finally {
      setIsSaving(false);
    }
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
        <div className="w-full max-w-md bg-card border border-border p-6 md:p-12 rounded-sm relative shadow-sm">
          
          <div className="flex justify-between items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-4xl font-bold mx-auto shadow-md border-4 border-background">
              {initials}
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="absolute top-6 right-6 text-xs text-muted-foreground hover:text-foreground">
                Edit
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-4 mb-8 w-full">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label-caps mb-1 block">FIRST NAME</label>
                  <input 
                    className="w-full bg-transparent field-focus outline-none py-2 font-sans text-foreground border-b border-border"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="flex-1">
                  <label className="label-caps mb-1 block">LAST NAME</label>
                  <input 
                    className="w-full bg-transparent field-focus outline-none py-2 font-sans text-foreground border-b border-border"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="label-caps mb-1 block">PHONE (OPTIONAL)</label>
                <input 
                  type="tel"
                  className="w-full bg-transparent field-focus outline-none py-2 font-sans text-foreground border-b border-border"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="flex flex-col gap-3 py-4 border-y border-border/50 mb-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={editShowEmail} 
                    onChange={(e) => setEditShowEmail(e.target.checked)}
                    className="accent-amber w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs uppercase tracking-widest font-bold group-hover:text-amber transition-colors">Show email publicly</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={editShowPhone} 
                    onChange={(e) => setEditShowPhone(e.target.checked)}
                    className="accent-amber w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs uppercase tracking-widest font-bold group-hover:text-amber transition-colors">Show phone publicly</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 bg-primary text-primary-foreground font-bold py-3 text-xs uppercase tracking-wider rounded-sm btn-press"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditFirstName(profile?.first_name || "");
                    setEditLastName(profile?.last_name || "");
                    setEditPhone(profile?.phone || "");
                    setEditShowEmail(profile?.show_email ?? true);
                    setEditShowPhone(profile?.show_phone ?? true);
                  }}
                  className="flex-1 border border-border text-foreground font-bold py-3 text-xs uppercase tracking-wider rounded-sm hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Full Name */}
              <h1 className="font-serif text-3xl text-foreground text-center mb-10 tracking-tight">
                {fullName}
              </h1>
              
              {/* Details */}
              <div className="space-y-5 mb-12 w-full">
                <div className="flex justify-between items-baseline border-b border-border pb-3">
                  <span className="label-caps">EMAIL</span>
                  <span className="font-sans text-foreground font-medium text-sm flex items-center gap-2">
                    {profile?.email ?? 'No email'}
                    {profile && profile.show_email === false && <span className="bg-red-500/10 text-red-500 text-[9px] uppercase font-bold py-0.5 px-1.5 rounded-sm">Hidden</span>}
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-b border-border pb-3">
                  <span className="label-caps">PHONE</span>
                  <span className="font-sans text-foreground font-medium text-sm flex items-center gap-2">
                    {profile?.phone || 'Not provided'}
                    {profile?.phone && profile.show_phone === false && <span className="bg-red-500/10 text-red-500 text-[9px] uppercase font-bold py-0.5 px-1.5 rounded-sm">Hidden</span>}
                  </span>
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
            </>
          )}
          
          {/* Admin Section */}
          {profile?.is_admin && (
            <div className="mb-6">
              <span className="label-caps block mb-3">ADMIN</span>
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-center gap-3 bg-amber-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl p-4 min-h-[44px] hover:bg-amber-600 transition-colors btn-press shadow-md"
              >
                <ShieldCheck size={18} />
                Admin Panel
              </button>
            </div>
          )}

          {/* Sign Out Button */}
          <button 
            onClick={handleSignOut}
            className="w-full py-4 min-h-[44px] border-2 border-primary text-primary font-bold uppercase tracking-wider text-xs hover:bg-primary hover:text-primary-foreground transition-colors duration-200 rounded-sm btn-press"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
