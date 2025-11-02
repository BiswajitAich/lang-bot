"use client";
import Link from "next/link";
import Image from "next/image";
import styles from "./Profile.module.css";
import { useQuery } from "@tanstack/react-query";

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
const Profile = () => {
  const { data: user, isLoading, error } = useUser();
  if (isLoading) return null;
  if (error || !user) return null;
  return (
    <div className={styles.userCard}>
      <Link href={"/user"} className={styles.userCard_l}>
        <Image
          src={user.image || "/user.png"}
          height={50}
          width={50}
          alt="user"
        />
        <div className={styles.name}>
          {user?.username || user.email || "user"}
        </div>
      </Link>
    </div>
  );
};

export default Profile;
