import SignUpform from "./form";
import styles from "../auth.module.css";
const Signup = () => {
    return (
        <section className={styles.cardContainer}>
            <h2 className={styles.heading}>Create Your Account</h2>
            <SignUpform />
        </section>
    );
}

export default Signup;