import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [authError, setAuthError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async () => {
    setEmailError("");
    setAuthError("");
    setSuccess(false);

    if (!email.endsWith("@bennett.edu.in")) {
      setEmailError("Only Bennett emails are allowed.");
      return;
    }

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://findmystuff-bu.vercel.app/reset-password'
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setResetSent(true);
      }
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(error.message);
      } else {
        setSuccess(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      console.log(error);
      if (error) {
        setAuthError(error.message);
      } else {
        navigate("/feed");
      }
    }
  };

  return (
    <div className="min-h-svh bg-background flex items-center justify-center p-6 page-enter">
      <div className="w-full max-w-md bg-card border border-foreground/10 p-12 shadow-[20px_20px_0px_hsl(var(--navy)/0.05)]">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xl mb-6 rounded-sm">
            BU
          </div>
          <h1 className="font-serif text-3xl text-foreground">University Portal</h1>
        </div>
        
        {success ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <p className="text-center">Account created. You can now sign in.</p>
            <button
              onClick={() => {
                setSuccess(false);
                setIsSignUp(false);
                setIsForgotPassword(false);
              }}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : resetSent ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <p className="text-center">Password reset link sent. Check your inbox.</p>
            <button
              onClick={() => {
                setResetSent(false);
                setIsForgotPassword(false);
              }}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="label-caps">Bennett email address</label>
                <input
                  type="email"
                  placeholder="name@bennett.edu.in"
                  className="bg-transparent field-focus outline-none py-2 font-sans text-foreground"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
              </div>

              {!isForgotPassword && (
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="label-caps">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="bg-transparent field-focus outline-none py-2 font-sans text-foreground"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {!isSignUp && (
                    <button
                      onClick={() => setIsForgotPassword(true)}
                      className="text-right text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mt-2"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="w-full text-center">
              <button 
                onClick={handleAuth}
                className="w-full mt-4 bg-primary text-primary-foreground font-bold px-6 py-3 uppercase tracking-wider text-xs hover:brightness-90 transition-all duration-200 rounded-sm btn-press"
              >
                {isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In"}
              </button>
              {authError && <p className="text-red-500 text-sm mt-2">{authError}</p>}
              
              {!isForgotPassword ? (
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              ) : (
                <button 
                  onClick={() => setIsForgotPassword(false)}
                  className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Sign In
                </button>
              )}
            </div>

            <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              Restricted to @bennett.edu.in accounts only
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
