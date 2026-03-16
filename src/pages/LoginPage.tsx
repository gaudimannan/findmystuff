import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // 1: initial, 2: otp sent, 3: email verified
  const [signupStep, setSignupStep] = useState(1);
  const [emailVerified, setEmailVerified] = useState(false);
  
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [resetSent, setResetSent] = useState(false);
  const [resentVerification, setResentVerification] = useState(false);
  const navigate = useNavigate();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit && value !== '') return;

    const newOtpArray = otp.split('');
    while(newOtpArray.length < 6) newOtpArray.push('');
    
    newOtpArray[index] = digit;
    const newOtp = newOtpArray.join('').slice(0, 6);
    setOtp(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newOtpArray = otp.split('');
      while(newOtpArray.length < 6) newOtpArray.push('');

      if (newOtpArray[index]) {
        // clear current box
        newOtpArray[index] = '';
        setOtp(newOtpArray.join(''));
      } else if (index > 0) {
        // clear previous box and focus it
        newOtpArray[index - 1] = '';
        setOtp(newOtpArray.join(''));
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      setOtp(pastedData);
      const nextIndex = Math.min(pastedData.length, 5);
      if (otpRefs.current[nextIndex]) {
        otpRefs.current[nextIndex]?.focus();
      } else if (otpRefs.current[5]) {
         otpRefs.current[5]?.focus();
      }
    }
  };

  const handleSendOtp = async () => {
    setEmailError("");
    setNameError("");
    setPhoneError("");
    setAuthError("");

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

    if (!email.endsWith("@bennett.edu.in")) {
      setEmailError("Only Bennett emails are allowed.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ email });
    
    if (error) {
      setAuthError(error.message);
    } else {
      setSignupStep(2);
    }
  };

  const handleVerifyOtp = async () => {
    setAuthError("");
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    
    if (error) {
      setAuthError("Invalid code. Try again.");
    } else {
      setEmailVerified(true);
      setSignupStep(3);
    }
  };

  const handleResendOtp = async () => {
    setAuthError("");
    setResentVerification(false);
    const { error } = await supabase.auth.signInWithOtp({ email });
    
    if (error) {
      setAuthError(error.message);
    } else {
      setResentVerification(true);
      setTimeout(() => setResentVerification(false), 3000);
    }
  };

  const handleAuth = async () => {
    setEmailError("");
    setNameError("");
    setPhoneError("");
    setAuthError("");
    setResentVerification(false);

    if (isForgotPassword) {
      if (!email.endsWith("@bennett.edu.in")) {
        setEmailError("Only Bennett emails are allowed.");
        return;
      }
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
      // Sign Up Button is only visible at Step 3
      if (password !== confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setAuthError("Password must be at least 6 characters.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      console.log('updateUser result:', updateError);
      
      if (updateError) {
        setAuthError(updateError.message);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id,
            email: user.email,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phoneNumber.trim()
          });
          
        console.log('upsert result:', profileError);
        console.log('upsert data:', firstName, lastName, phoneNumber, user?.id, user?.email);
          
        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }
      navigate("/feed");
    } else {
      if (!email.endsWith("@bennett.edu.in")) {
        setEmailError("Only Bennett emails are allowed.");
        return;
      }
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

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    setAuthError("");
    setEmailError("");
    setNameError("");
    setPhoneError("");
    setResentVerification(false);
    setSignupStep(1);
    setEmailVerified(false);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
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
        
        {resetSent ? (
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
                        readOnly={signupStep > 1}
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
                        readOnly={signupStep > 1}
                      />
                    </div>
                  </div>
                  {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
                  
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="label-caps">PHONE NUMBER</label>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit phone number"
                      className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      readOnly={signupStep > 1}
                    />
                    {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="label-caps">Bennett email address</label>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="email"
                          placeholder="name@bennett.edu.in"
                          className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          readOnly={signupStep > 1}
                        />
                      </div>
                      {signupStep === 1 && (
                        <button 
                          onClick={handleSendOtp} 
                          className="bg-primary text-primary-foreground text-[10px] uppercase tracking-widest font-bold px-3 py-2 rounded-sm whitespace-nowrap btn-press hover:brightness-90 transition-all"
                        >
                          Send OTP
                        </button>
                      )}
                      {signupStep === 2 && !emailVerified && (
                        <button 
                          disabled 
                          className="px-3 py-2 bg-muted text-muted-foreground text-[10px] uppercase tracking-widest font-bold rounded-sm whitespace-nowrap opacity-70"
                        >
                          Sent ✓
                        </button>
                      )}
                      {emailVerified && (
                        <div className="py-2 pr-2">
                          <span className="text-green-500 text-xs font-bold whitespace-nowrap">
                            Email verified ✓
                          </span>
                        </div>
                      )}
                    </div>
                    {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                  </div>

                  {signupStep === 2 && !emailVerified && (
                    <div className="flex flex-col gap-1.5 w-full mt-2">
                      <label className="label-caps">VERIFICATION CODE</label>
                      <div className="flex gap-2 justify-center mt-2 w-full">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              otpRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="w-10 h-12 text-center text-lg font-bold border border-foreground/20 rounded-sm bg-transparent text-foreground focus:border-amber focus:outline-none transition-colors duration-150"
                            value={otp[index] || ''}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={handleOtpPaste}
                          />
                        ))}
                      </div>
                      <div className="mt-1">
                        <button 
                          onClick={handleResendOtp}
                          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Resend code
                        </button>
                        {resentVerification && (
                          <span className="text-green-500 text-xs ml-2">Code resent.</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-1">
                        OTP may take up to 2 minutes to arrive.
                      </p>
                      <button 
                        onClick={handleVerifyOtp}
                        className="w-full mt-4 bg-primary text-primary-foreground font-bold px-6 py-3 uppercase tracking-wider text-xs hover:brightness-90 transition-all duration-200 rounded-sm btn-press"
                      >
                        Verify OTP
                      </button>
                    </div>
                  )}

                  {signupStep === 3 && emailVerified && (
                    <>
                      <div className="flex flex-col gap-1.5 w-full pt-2">
                        <label className="label-caps">PASSWORD</label>
                        <input
                          type="password"
                          placeholder="Create a password"
                          className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="label-caps">CONFIRM PASSWORD</label>
                        <input
                          type="password"
                          placeholder="Confirm your password"
                          className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Sign In / Forgot Password Forms */}
              {!isSignUp && (
                <>
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="label-caps">Bennett email address</label>
                    <input
                      type="email"
                      placeholder="name@bennett.edu.in"
                      className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
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
                        className="bg-transparent field-focus outline-none py-2 font-sans text-foreground w-full"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        onClick={() => setIsForgotPassword(true)}
                        className="text-right text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mt-2"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="w-full text-center">
              {(!isSignUp || (isSignUp && signupStep === 3)) && (
                <button 
                  onClick={handleAuth}
                  className="w-full mt-4 bg-primary text-primary-foreground font-bold px-6 py-3 uppercase tracking-wider text-xs hover:brightness-90 transition-all duration-200 rounded-sm btn-press"
                >
                  {isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In"}
                </button>
              )}
              
              {authError && (
                <div className="mt-2 flex flex-col items-center">
                  <p className="text-red-500 text-sm">{authError}</p>
                  {!isSignUp && authError === "Please verify your email first. Check your inbox for the verification link." && (
                    <button 
                      onClick={handleResendVerification}
                      className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Resend verification email
                    </button>
                  )}
                  {!isSignUp && resentVerification && (
                    <p className="text-green-500 text-sm mt-1">Verification email resent.</p>
                  )}
                </div>
              )}
              
              {!isForgotPassword ? (
                <button 
                  onClick={toggleMode}
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
