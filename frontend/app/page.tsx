import Link from "next/link";
import styles from "./page.module.css";
import Image from "next/image";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.message}>
            chat with artificial intelligence
          </div>
          <div className={styles.imageContainer}>
            <Image
              src={"/face.webp"}
              fill
              alt=""
              sizes="(max-width: 425px) 200px, (max-width: 768px) 350px, (max-width: 1200px) 600px"
              priority
            />
          </div>
        </div>
        <Link href={"/chat"} className={styles.redirect}>
          chat now
        </Link>
      </div>
    </main>
  );
}
