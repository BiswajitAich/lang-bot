"use client";
import { useActionState, useState, startTransition, useEffect } from "react";
import { signupAction, sendOtpAction, verifyOtpAction } from "./signupAction";
import { useRouter } from "next/navigation";
import styles from "./signupForm.module.css";

const SignUpForm = () => {
  const [state, formAction, isPending] = useActionState(signupAction, {
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    success: false,
    errors: {
      username: "",
      email: "",
      emailOtp: "",
      emailOtpVerified: false,
      password: "",
      passwordConfirmation: "",
    },
  });

  const [otpState, sendOtpFormAction, isOtpPending] = useActionState(
    sendOtpAction,
    {
      success: false,
      message: "",
    }
  );

  const [verifyState, verifyOtpFormAction, isVerifyPending] = useActionState(
    verifyOtpAction,
    {
      success: false,
      verified: false,
      message: "",
    }
  );

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSend, setOtpSend] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const router = useRouter();
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.endsWith("@gmail.com")) {
      alert("Please enter a valid Gmail address");
      return;
    }

    startTransition(() => {
      const formData = new FormData();
      formData.append("email", email);
      sendOtpFormAction(formData);
    });
    setOtpSend(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP");
      return;
    }

    startTransition(() => {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("otp", otp);
      verifyOtpFormAction(formData);
    });
  };

  // Check if OTP was verified successfully and update local state
  useEffect(() => {
    if (verifyState.verified && !emailVerified) {
      setEmailVerified(true);
    }
  }, [verifyState.verified, emailVerified]);

  // Show success message if signup was successful

  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => {
        router.push("/"); // or redirect if you're using that
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [state.success]);
  if (state.success) {
    return (
      <div>
        <h3>Account Created Successfully!</h3>
        <p>{state.message}</p>
        <p>You can now log in with your credentials.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.formCard}>
      {/* First name Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="firstname" className={styles.label}>
          First Name
        </label>
        <input
          id="firstname"
          name="firstname"
          type="text"
          placeholder="Enter firstname"
          minLength={3}
          maxLength={20}
          defaultValue={state.firstname || ""}
          className={styles.inputField}
        />
      </div>

      {/* Last name Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="lastname" className={styles.label}>
          Last Name
        </label>
        <input
          id="lastname"
          name="lastname"
          type="text"
          placeholder="Enter lastname"
          minLength={3}
          maxLength={20}
          defaultValue={state.lastname || ""}
          className={styles.inputField}
        />
      </div>

      {/* Username Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="username" className={styles.label}>
          Username <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="Enter username (3-20 characters, letters, numbers, underscores only)"
          required
          minLength={3}
          maxLength={20}
          defaultValue={state.username}
          className={styles.inputField}
        />
        {state?.errors?.username && (
          <p className={styles.errorMessage}>{state.errors.username}</p>
        )}
      </div>

      {/* Email Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="email" className={styles.label}>
          Email <span className={styles.requiredAsterisk}>*</span>
          {emailVerified && (
            <span className={styles.verifiedBadge}>✓ Verified</span>
          )}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your Gmail address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={emailVerified}
          required
          className={styles.inputField}
        />
        {state?.errors?.email && (
          <p className={styles.errorMessage}>{state.errors.email}</p>
        )}
      </div>

      {/* Send OTP Button */}
      {!emailVerified && (
        <div className={styles.fieldGroup}>
          <button
            aria-label="Send OTP"
            type="button"
            onClick={handleSendOtp}
            disabled={isOtpPending || !email || otpSend}
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            {isOtpPending && <span className={styles.loadingSpinner}></span>}
            {isOtpPending ? "Sending..." : otpSend ? "Check Email" : "Send OTP"}
          </button>
          {otpState?.message && (
            <p
              className={
                otpState.success ? styles.successMessage : styles.errorMessage
              }
            >
              {otpState.message}
            </p>
          )}
        </div>
      )}

      {/* OTP Field and Verify Button */}
      {!emailVerified && (
        <div className={styles.fieldGroup}>
          <label htmlFor="email-otp" className={styles.label}>
            Email OTP <span className={styles.requiredAsterisk}>*</span>
          </label>
          <div className={styles.otpSection}>
            <input
              id="email-otp"
              type="text"
              placeholder="Enter 6-digit OTP from your email"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              maxLength={6}
              required
              className={`${styles.inputField} ${styles.otpInput}`}
            />
            <button
              aria-label="OTP Verify"
              type="button"
              onClick={handleVerifyOtp}
              disabled={isVerifyPending || otp.length !== 6}
              className={styles.button}
            >
              {isVerifyPending && (
                <span className={styles.loadingSpinner}></span>
              )}
              {isVerifyPending ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
          {verifyState?.message && (
            <p
              className={
                verifyState.verified
                  ? styles.successMessage
                  : styles.errorMessage
              }
            >
              {verifyState.message}
            </p>
          )}
        </div>
      )}

      {/* Hidden field to pass verified email to form submission */}
      {emailVerified && (
        <input
          type="hidden"
          name="email"
          value={email}
          className={styles.hiddenField}
        />
      )}

      {/* Hidden field to indicate email is verified */}
      {emailVerified && (
        <input
          type="hidden"
          name="emailVerified"
          value="true"
          className={styles.hiddenField}
        />
      )}

      {/* Password Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="password" className={styles.label}>
          Password <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters with uppercase, lowercase, and number"
          required
          minLength={8}
          defaultValue={state.password}
          className={styles.inputField}
        />
        {state?.errors?.password && (
          <p className={styles.errorMessage}>{state.errors.password}</p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="password-confirmation" className={styles.label}>
          Confirm Password <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          id="password-confirmation"
          name="password-confirmation"
          type="password"
          placeholder="Re-enter your password"
          required
          defaultValue={state.passwordConfirmation}
          className={styles.inputField}
        />
        {state?.errors?.passwordConfirmation && (
          <p className={styles.errorMessage}>
            {state.errors.passwordConfirmation}
          </p>
        )}
      </div>

      {/* General Error/Success Message */}
      {state?.message && (
        <div
          className={`${styles.generalMessage} ${
            state.success
              ? styles.generalMessageSuccess
              : styles.generalMessageError
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Submit Button */}
      <button
        aria-label="Sign Up"
        type="submit"
        disabled={isPending || !emailVerified}
        className={`${styles.button} ${styles.submitButton}`}
      >
        {isPending && <span className={styles.loadingSpinner}></span>}
        {isPending
          ? "Creating Account..."
          : !emailVerified
          ? "Verify Email First"
          : "Create Account"}
      </button>

      {/* Email verification status message */}
      {!emailVerified && email && (
        <p className={styles.warningMessage}>
          Please verify your email address before creating your account.
        </p>
      )}
    </form>
  );
};

export default SignUpForm;
