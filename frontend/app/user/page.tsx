"use client";
import { useEffect, useState } from "react";
import styles from "./ProfilePage.module.css";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { sendOtpAction, verifyOtpAction, deleteUserAction } from "./userAction";

interface SessionUser {
  id: number;
  username: string;
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  image?: string;
}

function useUser() {
  return useQuery<SessionUser>({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default function ProfilePage() {
  const { data: user, isLoading, error } = useUser();
  const [confirmText, setConfirmText] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || error)) {
      router.replace("/");
    }
  }, [user, error, isLoading]);

  const sendOtp = async () => {
    if (!user?.email) {
      setOtpSent(false);
      throw new Error("User email not found.");
    }
    setOtpSent(true);
    const res = await sendOtpAction(user?.email);
    if (!res.success) throw new Error(res.message);
  };

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== "confirm") return;
    if (!otp) throw new Error("OTP Error!");
    if (!user?.email) throw new Error("user.email Error!");
    setIsVerifying(true);
    const res = await verifyOtpAction(user?.email, otp);
    if (!res.success) throw new Error(res.message);
    const resp = await deleteUserAction(user.id, user.username);
    if (!resp.success) throw new Error(resp.message);
    router.replace("/");
  };

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.avatarContainer}>
          <Image
            src={user?.image || "/user.png"}
            alt="User Avatar"
            width={120}
            height={120}
            className={styles.avatar}
          />
          <div className={styles.glow}></div>
        </div>

        <div className={styles.info}>
          <h1 className={styles.username}>{user?.username}</h1>
          <p className={styles.email}>{user?.email}</p>
          {(user?.firstname || user?.lastname) && (
            <p className={styles.fullname}>
              {user?.firstname} {user?.lastname}
            </p>
          )}
        </div>
      </div>

      <div className={styles.deleteSection}>
        <h2 className={styles.deleteTitle}>Delete Account</h2>
        <p className={styles.warning}>
          ⚠ This action is <strong>irreversible</strong>. To confirm deletion,
          type <code>confirm</code> below and verify via OTP.
        </p>

        <input
          type="text"
          placeholder='Type "confirm" here...'
          className={styles.confirmInput}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />

        {!otpSent ? (
          <button
            className={styles.sendOtpBtn}
            disabled={confirmText.toLowerCase() !== "confirm"}
            onClick={sendOtp}
          >
            Send OTP to {user?.email}
          </button>
        ) : (
          <div className={styles.otpContainer}>
            <input
              type="text"
              placeholder="Enter OTP"
              className={styles.otpInput}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={isVerifying || otp.length === 0}
            >
              {isVerifying ? "Verifying..." : "Confirm Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
