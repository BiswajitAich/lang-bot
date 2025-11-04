"use client";

import { useActionState, useEffect, useState } from "react";
import LoginAction from "./loginAction";
import { useRouter } from "next/navigation";
import styles from "./loginForm.module.css";
interface Placeholder {
  username: string;
  email: string;
  password: string;
  credentialsStatus: boolean;
  errors: {
    usernameMsg: string;
    emailMsg: string;
    passwordMsg: string;
    message: string;
  };
}
const placeholder: Placeholder = {
  username: "",
  email: "",
  password: "",
  credentialsStatus: false,
  errors: {
    usernameMsg: "",
    emailMsg: "",
    passwordMsg: "",
    message: "",
  },
};
const LoginForm = () => {
  const [openEye, setOpenEye] = useState<boolean>(false);
  const [state, action, isPending] = useActionState(LoginAction, placeholder);
  const router = useRouter();
  useEffect(() => {
    if (state.credentialsStatus) {
      // const timer = setTimeout(() => {
      router.push("/chat");
      // }, 3000);
      // return () => clearTimeout(timer);
    }
  }, [state.credentialsStatus, router]);

  // if (state.credentialsStatus) {
  //   return (
  //     <div>
  //       <p>Logged in redirecting to Home page...</p>
  //     </div>
  //   );
  // }
  return (
    <form action={action} className={styles.formCard}>
      <div className={styles.fieldGroup}>
        <label htmlFor="username" className={styles.label}>
          Username
        </label>
        <input
          name="username"
          type="text"
          minLength={3}
          maxLength={20}
          placeholder="Enter Username..."
          defaultValue={state.username}
          className={styles.inputField}
        />
        {state?.errors?.usernameMsg && (
          <p className={styles.errorMessage}>{state.errors.usernameMsg}</p>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          name="email"
          type="email"
          placeholder="Enter Gmail (ex: ...@gmail.com)"
          defaultValue={state.email}
          className={styles.inputField}
        />
        {state?.errors?.emailMsg && (
          <p className={styles.errorMessage}>{state.errors.emailMsg}</p>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <div className={styles.passwordContainer}>
          <input
            name="password"
            type={openEye ? "text" : "password"}
            placeholder="********"
            defaultValue={state.password}
            className={`${styles.inputField} ${styles.passwordInput}`}
          />
          <button
            type="button"
            onClick={() => setOpenEye(!openEye)}
            className={styles.eyeButton}
            aria-label={openEye ? "Hide password" : "Show password"}
          >
            {openEye ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
        {state?.errors?.passwordMsg && (
          <p className={styles.errorMessage}>{state.errors.passwordMsg}</p>
        )}
      </div>

      <button
        aria-label="Sign In"
        type="submit"
        disabled={isPending || state.credentialsStatus}
        className={`${styles.button} ${styles.submitButton} ${
          state.credentialsStatus ? styles.submitButtonSuccess : ""
        }`}
      >
        {isPending && <span className={styles.loadingSpinner}></span>}
        {isPending
          ? "Submitting..."
          : state.credentialsStatus
          ? "Submitted"
          : "Sign In"}
      </button>

      {state.errors.message && (
        <div
          className={`${styles.generalMessage} ${styles.generalMessageError}`}
        >
          {state.errors.message}
        </div>
      )}
    </form>
  );
};

export default LoginForm;
