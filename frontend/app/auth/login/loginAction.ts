"use server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

interface Login {
  username: string;
  email: string;
  password: string;
}

interface LoginReturnState extends Login {
  credentialsStatus: boolean;
  errors: {
    usernameMsg: string;
    emailMsg: string;
    passwordMsg: string;
    message: string;
  };
}

// Email validation regex
const emailRegex = /^[^\s@]+@gmail\.com$/;
// Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
// Username validation: alphanumeric and underscores, 3-20 chars
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

const API = process.env.DOCKER_BACKEND_URL;
export default async function LoginAction(
  prevState: LoginReturnState,
  data: FormData
): Promise<LoginReturnState> {
  const username = data.get("username")?.toString().trim();
  const email = data.get("email")?.toString().trim().toLocaleLowerCase();
  const password = data.get("password")?.toString().trim();
  const initialState: LoginReturnState = {
    username: username || prevState.username,
    email: email || prevState.email,
    password: password || prevState.password,
    credentialsStatus: prevState.credentialsStatus,
    errors: {
      usernameMsg: "",
      emailMsg: "",
      passwordMsg: "",
      message: "",
    },
  };
  let isError: boolean = false;

  if (!email || !username || !password) {
    if (!email) {
      initialState.errors.emailMsg = "Please Fill the Gmail Field.";
    }
    if (!username) {
      initialState.errors.usernameMsg = "Please Fill the username Field.";
    }
    if (!password) {
      initialState.errors.passwordMsg = "Please Fill the password Field.";
    }
    isError = true;
  } else if (!emailRegex.test(email)) {
    initialState.errors.emailMsg = "Please Fill a valid Gmail only.";
    isError = true;
  } else if (!usernameRegex.test(username)) {
    initialState.errors.usernameMsg =
      "Username must be 3-20 characters long and contain only letters, numbers, and underscores.";
    isError = true;
  } else if (!passwordRegex.test(password)) {
    initialState.errors.passwordMsg =
      "Password must be at least 8 chars, 1 uppercase, 1 lowercase, 1 number.";
    isError = true;
  } else {
    isError = false;
  }
  if (isError) {
    return initialState;
  }
  try {
    
    const response = await fetch(
      `${API}/auth/check-user-credentials`,
      {
        method: "POST",
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      initialState.errors.message = `Server error: ${response.status}`;
      return initialState;
    }
    const data = await response.json();

    if (data.success) {
      const auth_token = jwt.sign(
        {
          id: data.user.id,
          username: username,
          email: email,
          firstname: data.user.first_name || null,
          lastname: data.user.last_name || null,
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: "7d",
        }
      );
      (await cookies()).set("auth_token", auth_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    initialState.credentialsStatus = data.success;
    if (!data.success) {
      initialState.errors.message = data.message;
    }
    return initialState;
  } catch (error) {
    console.log(error);
    initialState.errors.message = error?.toString() || "Something went wrong";
    return initialState;
  }
}
