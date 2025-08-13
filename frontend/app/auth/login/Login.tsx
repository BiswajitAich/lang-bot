import LoginForm from "./form";
import styles from "../auth.module.css";
const Login = () => {
    return (
        <section className={styles.cardContainer}>
            <h2 className={styles.heading}>Login to your Account</h2>
            <LoginForm />
        </section>
    );
}

export default Login;