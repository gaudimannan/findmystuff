import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [authError, setAuthError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resentVerification, setResentVerification] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async () => {
    setEmailError("");
    setNameError("");
    setPhoneError("");
    setAuthError("");
    setSuccess(false);
    setResentVerification(false);

    if (isSignUp) {
      let hasError = false;
      
      if (!firstName.trim() || !lastName.trim()) {
        setNameError("Please enter your first and last name.");
        hasError = true;
      }
      
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        setPhoneError("Please enter a valid 10-digit phone number.");
        hasError = true;
      }
      
      if (hasError) return;
    }

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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phoneNumber.trim()
          })
          .eq('id', data.user.id);
          
        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
        setSuccess(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      console.log(error);
      if (error) {
        if (error.message === "Email not confirmed") {
          setAuthError("Please verify your email first. Check your inbox for the verification link.");
        } else {
          setAuthError(error.message);
        }
      } else {
        navigate("/feed");
      }
    }
  };

  const handleResendVerification = async () => {
    setResentVerification(false);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email });
    if (!error) {
      setResentVerification(true);
      setTimeout(() => setResentVerification(false), 3000);
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
            <p className="text-center">Verification email sent to {email}. Please check your inbox and click the link to activate your account.</p>
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
              {isSignUp && !isForgotPassword && (
                <>
                  <div className="flex gap-4 w-full overflow-hidden">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <label className="label-caps">FIRST NAME</label>
                      <input
                        type="text"
                        placeholder="Enter your first name"
                        className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <label className="label-caps">LAST NAME</label>
                      <input
                        type="text"
                        placeholder="Enter your last name"
                        className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
                  
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="label-caps">PHONE NUMBER</label>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit phone number"
                      className="bg-transparent field-focus outline-none py-2 font-sans text-foreground"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                  </div>
                </>
              )}

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
              {authError && (
                <div className="mt-2 flex flex-col items-center">
                  <p className="text-red-500 text-sm">{authError}</p>
                  {authError === "Please verify your email first. Check your inbox for the verification link." && (
                    <button 
                      onClick={handleResendVerification}
                      className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Resend verification email
                    </button>
                  )}
                  {resentVerification && (
                    <p className="text-green-500 text-sm mt-1">Verification email resent.</p>
                  )}
                </div>
              )}
              
              {!isForgotPassword ? (
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError("");
                    setEmailError("");
                    setNameError("");
                    setPhoneError("");
                    setResentVerification(false);
                  }}
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
