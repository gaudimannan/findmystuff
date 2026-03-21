import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "../lib/supabase";
import { findMatches } from "../lib/gemini";

const locationOptions = ["Library", "Block A", "Block B", "Cafeteria", "Sports Complex", "Main Gate", "Other"];
const categoryOptions = ["Keys", "ID Card", "Laptop", "Earbuds", "Bag", "Charger", "Other"];

const PostItemPage = () => {
  const navigate = useNavigate();
  const [itemType, setItemType] = useState<"Lost" | "Found">("Found");
  const [isDragOver, setIsDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [matchedItems, setMatchedItems] = useState<any[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("item-images").upload(fileName, file);
    
    if (!uploadError) {
      const { data } = supabase.storage.from("item-images").getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
    setShowUploadSheet(false);
  };

  const handleDropzoneClick = () => {
    if (window.innerWidth < 768) {
      setShowUploadSheet(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to post an item.");
      setLoading(false);
      return;
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('items').insert({
      title,
      description,
      category,
      location,
      type: itemType,
      image_url: imageUrl,
      user_id: user.id,
      expires_at: expiresAt
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      // Scan for AI matches
      try {
        const oppositeType = itemType === 'Lost' ? 'Found' : 'Lost';
        const { data: existingItems } = await supabase
          .from('items')
          .select('id, title, description, category, location')
          .eq('type', oppositeType)
          .eq('status', 'active')
          .limit(20);

        if (existingItems && existingItems.length > 0) {
          const matchIndices = await findMatches(
            { title, description, category, location, type: itemType },
            existingItems
          );

          if (matchIndices.length > 0) {
            const matched = matchIndices
              .filter(i => i >= 0 && i < existingItems.length)
              .map(i => existingItems[i]);
            if (matched.length > 0) {
              setMatchedItems(matched);
              setShowMatchModal(true);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('AI match error:', err);
      }

      navigate("/feed");
    }
  };

  return (
    <div className="min-h-screen bg-background page-enter">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 md:px-8 py-16 md:py-20">
        <h1 className="font-serif text-4xl text-foreground mb-12">Post an Item</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {/* Image upload */}
          <div
            onClick={handleDropzoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed border-foreground/20 flex flex-col items-center justify-center p-12 bg-card/50 aspect-square rounded-sm cursor-pointer transition-[border-color,background-color] duration-100 ${
              isDragOver ? "dropzone-active" : "hover:border-foreground/40"
            }`}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
            />
            <input 
              type="file" 
              className="hidden" 
              ref={cameraInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              capture="environment" 
            />
            <input 
              type="file" 
              className="hidden" 
              ref={galleryInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
            />
            {imageUrl ? (
              <img src={imageUrl} alt="Upload preview" className="w-full h-full object-cover rounded-sm" />
            ) : (
              <p className="label-caps text-center leading-relaxed">
                Drop photo here<br />or click to upload
              </p>
            )}
          </div>

          {/* Form */}
          <div className="space-y-7">
            {/* Type toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="label-caps">Type</label>
              <div className="flex gap-2">
                {(["Lost", "Found"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setItemType(t)}
                    className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-sm transition-[background-color,color] duration-100 ${
                      itemType === t
                        ? "bg-secondary text-secondary-foreground"
                        : "border border-foreground/20 text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="label-caps">Item Title</label>
              <input
                type="text"
                placeholder="e.g. Sony WH-1000XM4"
                className="bg-transparent field-focus outline-none py-2 font-sans text-foreground"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="label-caps">Description</label>
              <textarea
                placeholder="Color, identifying marks, when you last had it..."
                className="bg-transparent field-focus outline-none py-2 font-sans text-foreground min-h-[100px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Category + Location */}
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-1.5">
                <label className="label-caps">Category</label>
                <select 
                  className="bg-transparent field-focus outline-none py-2 font-sans text-foreground rounded-none appearance-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select...</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label-caps">Location</label>
                <select 
                  className="bg-transparent field-focus outline-none py-2 font-sans text-foreground rounded-none appearance-none"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">Select...</option>
                  {locationOptions.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-center gap-2.5 py-2 cursor-pointer">
              <input type="checkbox" className="accent-amber w-4 h-4" />
              <span className="text-[11px] uppercase tracking-widest font-bold text-foreground/70">
                Show contact publicly
              </span>
            </label>

            {/* Submit */}
            <div className="w-full">
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-bold px-6 py-3.5 uppercase tracking-wider text-xs hover:brightness-90 transition-all duration-200 rounded-sm btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Posting..." : "Post Item"}
              </button>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Upload Bottom Sheet */}
      {showUploadSheet && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowUploadSheet(false)}
          />
          <div className="relative w-full max-w-md bg-[hsl(var(--navy))] rounded-t-lg p-6 pb-8 space-y-3 animate-in slide-in-from-bottom duration-200">
            <button
              onClick={() => {
                cameraInputRef.current?.click();
              }}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 uppercase tracking-wider text-xs rounded-sm btn-press hover:brightness-90 transition-all"
            >
              📷 Take Photo
            </button>
            <button
              onClick={() => {
                galleryInputRef.current?.click();
              }}
              className="w-full border border-[hsl(var(--off-white))] text-[hsl(var(--off-white))] font-bold py-3.5 uppercase tracking-wider text-xs rounded-sm btn-press hover:bg-white/10 transition-all"
            >
              🖼 Choose from Gallery
            </button>
            <button
              onClick={() => setShowUploadSheet(false)}
              className="w-full text-center text-[hsl(var(--off-white))] text-xs uppercase tracking-widest font-medium pt-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AI Match Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowMatchModal(false); navigate("/feed"); }}
          />
          <div className="relative bg-[hsl(var(--navy))] w-full max-w-sm p-8 rounded-sm border border-foreground/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="font-serif text-2xl text-[hsl(var(--off-white))] text-center mb-2">
              🎯 Possible Match Found!
            </h2>
            <p className="text-center text-[hsl(var(--off-white))]/70 text-sm mb-6">
              We found {matchedItems.length} possible match{matchedItems.length > 1 ? 'es' : ''} for your item.
            </p>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {matchedItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setShowMatchModal(false); navigate(`/item/${item.id}`); }}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm p-4 transition-colors"
                >
                  <p className="text-[hsl(var(--off-white))] font-bold text-sm">{item.title}</p>
                  <p className="text-[hsl(var(--off-white))]/50 text-xs mt-1 uppercase tracking-widest">{item.location}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setShowMatchModal(false); navigate("/feed"); }}
              className="w-full bg-primary text-primary-foreground font-bold py-3 uppercase tracking-wider text-xs rounded-sm btn-press hover:brightness-90 transition-all"
            >
              Continue to Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostItemPage;
