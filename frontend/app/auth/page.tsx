"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const Login = dynamic(() => import("./login/Login"), {
  loading: () => <p>loading...</p>,
});
const Signup = dynamic(() => import("./signup/Signup"), {
  loading: () => <p>loading...</p>,
});
import styles from "./auth.module.css";
const Auth = () => {
  const [auth, setAuth] = useState<"login" | "signup">("login");
  const [hover, setHover] = useState<number>();
  const [countDiv, setCountDiv] = useState<number>(100);

  useEffect(() => {
    const width = window.innerWidth;
    setCountDiv(width > 800 ? 200 : width < 400 ? 40 : 80);
  }, []);
  function handleAuth(): void {
    if (auth === "login") {
      setAuth("signup");
    } else {
      setAuth("login");
    }
  }

  return (
    <main className={styles.authmain}>
      {auth === "login" ? <Login /> : <Signup />}
      <button type="button" onClick={handleAuth} className={styles.authchange}>
        {auth === "login" ? (
          <p>
            Don't have an account, <strong>signup</strong>
          </p>
        ) : (
          <p>
            Already have an account, <strong>login</strong>
          </p>
        )}
      </button>
      <div className={styles.boxes}>
        {Array.from({ length: countDiv }, (_, idx: number) => (
          <span
            key={idx}
            className={`${styles.box} ${
              hover === idx ? styles.boxAnimate : ""
            }`}
            onMouseOver={() => setHover(idx)}
          />
        ))}
      </div>
    </main>
  );
};

export default Auth;
