import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronLeft, Loader2, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { signIn, setupRecaptcha, signInWithPhone } from '../lib/firebase';
import { Capacitor } from '@capacitor/core';
import { cn } from '../lib/utils';

type Step = 'options' | 'phone' | 'otp';

interface LoginProps {
  onGuestMode: () => void;
}

export const Login = ({ onGuestMode }: LoginProps) => {
  const [step, setStep] = useState<Step>('options');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isNative = Capacitor.isNativePlatform();

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      // Web: popup resolves here. Android: redirect fires — onAuthStateChanged catches it.
    } catch (err: any) {
      if (err?.code !== 'auth/cancelled-popup-request' && err?.code !== 'auth/popup-closed-by-user') {
        setError('Google Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Phone Auth ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const full = `+91${phoneNumber.trim()}`;
    if (phoneNumber.length < 10) return;
    setLoading(true);
    setError(null);
    try {
      const recaptcha = setupRecaptcha('recaptcha-container');
      if (!recaptcha) throw new Error('reCAPTCHA init failed');
      const result = await signInWithPhone(full, recaptcha);
      setConfirmationResult(result);
      setStep('otp');
      setResendTimer(30);
    } catch (err: any) {
      console.error('Phone auth error:', err);
      setError('Could not send OTP. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6 || !confirmationResult) return;
    setLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(code);
      // onAuthStateChanged in App.tsx handles navigation
    } catch (err: any) {
      setError('Incorrect code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input helpers ───────────────────────────────────────────────────────
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F0] via-[#EEEEE6] to-[#F0F0E8] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-[#5A5A40]/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-80 h-80 rounded-full bg-[#5A5A40]/8 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/40 blur-3xl pointer-events-none" />

      {/* Invisible reCAPTCHA mount point */}
      <div id="recaptcha-container" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-[#5A5A40] to-[#3F3F2D] rounded-[24px] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-[#5A5A40]/30"
          >
            <BookOpen className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] tracking-tight">StudyIndex</h1>
          <p className="text-[#5A5A40]/60 mt-1.5 text-sm font-medium">Your AI Study Companion</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step: Options ─────────────────────────────────────────────── */}
          {step === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] p-4 rounded-2xl font-semibold shadow-md shadow-black/5 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#5A5A40]" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              {/* Phone */}
              <button
                onClick={() => { setStep('phone'); setError(null); }}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#5A5A40] to-[#4A4A30] text-white p-4 rounded-2xl font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all active:scale-[0.98] shadow-md shadow-[#5A5A40]/25"
              >
                <Phone className="w-5 h-5" />
                Continue with Phone
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#1A1A1A]/10" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5A5A40]/50">or</span>
                <div className="flex-1 h-px bg-[#1A1A1A]/10" />
              </div>

              <button
                onClick={onGuestMode}
                className="w-full text-center text-sm font-semibold text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors py-1 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Continue as Guest
              </button>

              {isNative && (
                <p className="text-center text-[11px] text-[#5A5A40]/40 mt-4 leading-relaxed px-2">
                  On Android, Google Sign-In opens a browser window to complete. Phone auth works directly in-app.
                </p>
              )}
            </motion.div>
          )}

          {/* ── Step: Phone Input ─────────────────────────────────────────── */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <button
                onClick={() => { setStep('options'); setError(null); }}
                className="flex items-center gap-1 text-sm font-medium text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors -ml-1 mb-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div>
                <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Your phone number</h2>
                <p className="text-sm text-[#5A5A40]/60 mt-1">We'll send a one-time verification code</p>
              </div>

              <div className="flex gap-2">
                <div className="bg-white border border-[#1A1A1A]/10 rounded-xl px-3 flex items-center justify-center text-sm font-bold text-[#1A1A1A] min-w-[52px] shadow-sm">
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  autoFocus
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  className="flex-1 bg-white border border-[#1A1A1A]/10 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 shadow-sm"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={loading || phoneNumber.length < 10}
                className="w-full bg-[#5A5A40] text-white p-4 rounded-2xl font-semibold hover:bg-[#4A4A30] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
              </button>
            </motion.div>
          )}

          {/* ── Step: OTP Verify ──────────────────────────────────────────── */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <button
                onClick={() => { setStep('phone'); setError(null); setOtp(['','','','','','']); }}
                className="flex items-center gap-1 text-sm font-medium text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors -ml-1 mb-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div>
                <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Enter the code</h2>
                <p className="text-sm text-[#5A5A40]/60 mt-1">
                  Sent to <span className="font-semibold text-[#1A1A1A]">+91 {phoneNumber}</span>
                </p>
              </div>

              {/* 6-digit OTP boxes */}
              <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={i === 0}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={cn(
                      "w-11 h-13 text-center text-xl font-bold bg-white border-2 rounded-xl focus:outline-none transition-all",
                      digit ? "border-[#5A5A40] text-[#1A1A1A]" : "border-[#1A1A1A]/10 text-[#1A1A1A]/40",
                      "focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/10"
                    )}
                    style={{ height: '52px' }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl text-center">{error}</p>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.join('').length !== 6}
                className="w-full bg-[#5A5A40] text-white p-4 rounded-2xl font-semibold hover:bg-[#4A4A30] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <><ShieldCheck className="w-5 h-5" /> Verify &amp; Sign In</>
                )}
              </button>

              <p className="text-center text-sm text-[#5A5A40]/60">
                {resendTimer > 0 ? (
                  `Resend code in ${resendTimer}s`
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="underline font-semibold text-[#5A5A40] disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-[11px] text-[#5A5A40]/30 mt-8">
          By continuing, you agree to our Terms &amp; Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};
