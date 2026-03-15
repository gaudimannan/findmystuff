import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async () => {
    setAuthError("");
    setSuccess(false);

    if (!password) {
      setAuthError("Password cannot be empty.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      setAuthError(error.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-svh bg-background flex items-center justify-center p-6 page-enter">
      <div className="w-full max-w-md bg-card border border-foreground/10 p-12 shadow-[20px_20px_0px_hsl(var(--navy)/0.05)]">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xl mb-6 rounded-sm">
            BU
          </div>
          <h1 className="font-serif text-3xl text-foreground">Update Password</h1>
        </div>
        
        {success ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <p className="text-center">Password updated. You can now sign in.</p>
            <Link to="/">
              <button
                className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Go to Sign In
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="label-caps">New Password</label>
                <input
                  type="password"
                  placeholder="Enter your new password"
                  className="bg-transparent field-focus outline-none py-2 font-sans text-foreground"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full text-center">
              <button 
                onClick={handleUpdatePassword}
                className="w-full mt-4 bg-primary text-primary-foreground font-bold px-6 py-3 uppercase tracking-wider text-xs hover:brightness-90 transition-all duration-200 rounded-sm btn-press"
              >
                Update Password
              </button>
              {authError && <p className="text-red-500 text-sm mt-2">{authError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
