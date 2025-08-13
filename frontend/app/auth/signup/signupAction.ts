"use server";
import { sendOtpEmail, verifyOtpCode } from "@biswajitaich/email-auth";

interface ReturnState {
  firstname: string | null;
  lastname: string | null;
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  success: boolean;
  errors: {
    username: string;
    email: string;
    emailOtp: string;
    emailOtpVerified: boolean;
    password: string;
    passwordConfirmation: string;
  };
  message?: string;
}

// Email validation regex
const emailRegex = /^[^\s@]+@gmail\.com$/;
// Password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
// Username validation: alphanumeric and underscores, 3-20 chars
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

const API = process.env.DOCKER_BACKEND_URL;

export async function signupAction(
  prevState: ReturnState,
  formData: FormData
): Promise<ReturnState> {
  console.log("1=======================================================");
  let returnState: ReturnState = {
    firstname: null,
    lastname: null,
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
  };

  const firstname = formData.get("firstname")?.toString().trim();
  const lastname = formData.get("lastname")?.toString().trim();
  const username = formData.get("username")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const passwordConfirmation = formData
    .get("password-confirmation")
    ?.toString();
  returnState.firstname = firstname || null;
  returnState.lastname = lastname || null;
  returnState.username = username!;
  returnState.email = email!;
  returnState.password = password!;
  returnState.passwordConfirmation = passwordConfirmation!;
  let hasErrors = false;

  // Validate username
  if (!username) {
    returnState.errors.username = "Username is required";
    hasErrors = true;
  } else if (!usernameRegex.test(username)) {
    returnState.errors.username =
      "Username must be 3-20 characters long and contain only letters, numbers, and underscores";
    hasErrors = true;
  } else {
    hasErrors = false;
  }

  // Validate email
  if (!email) {
    returnState.errors.email = "Email is required";
    hasErrors = true;
  } else if (!emailRegex.test(email)) {
    returnState.errors.email =
      "Please enter a valid Gmail address (example@gmail.com)";
    hasErrors = true;
  } else {
    hasErrors = false;
  }

  // Validate email OTP - only if email verification is required
  if (!prevState?.errors?.emailOtpVerified) {
    returnState.errors.emailOtp =
      "Email must be verified before account creation";
    hasErrors = true;
  } else {
    hasErrors = false;
  }

  // Validate password
  if (!password) {
    returnState.errors.password = "Password is required";
    hasErrors = true;
  } else if (!passwordRegex.test(password)) {
    returnState.errors.password =
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number";
    hasErrors = true;
  } else {
    hasErrors = false;
  }

  // Validate password confirmation
  if (!passwordConfirmation) {
    returnState.errors.passwordConfirmation =
      "Password confirmation is required";
    hasErrors = true;
  } else if (password !== passwordConfirmation) {
    returnState.errors.passwordConfirmation = "Passwords do not match";
    hasErrors = true;
  } else {
    hasErrors = false;
  }

  if (hasErrors) {
    return returnState;
  }

  try {
    const userExists = await checkUserExists(username!);
    if (userExists.success) {
      returnState.errors.username = userExists.message;
      hasErrors = true;
    } else {
      returnState.errors.username = "";
    }
    if (hasErrors) {
      return returnState;
    }

    const user = await createUser({
      first_name: firstname || null,
      last_name: lastname || null,
      username: username!,
      email: email!,
      password: password!,
    });

    returnState.success = user.success;
    returnState.message = user.message;
    //   returnState.errors.emailOtpVerified = true;
  } catch (error) {
    console.error("Signup error:", error);
    returnState.message = "An unexpected error occurred. Please try again.";
  }

  console.log(returnState);
  // await new Promise((res) => setTimeout(res, 3000));
  return returnState;
}

// ---------------------------------------------------------------------------------------------------
// sendOtpAction.ts - sending OTP to users provided email
export async function sendOtpAction(_prevState: any, formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();

  if (!email || !emailRegex.test(email)) {
    return {
      success: false,
      message: "Please enter a valid Gmail address",
    };
  }

  try {
    const check = await checkEmailExists(email);
    if (check.success) {
      return {
        success: false,
        message: `${email} is already used to signup.\n Try loggin!`,
      };
    }

    const result = await sendOtpEmail(email, "lang-bot");
    if (result.success) {
      return {
        success: true,
        message: "OTP sent to your email address",
      };
    } else {
      return {
        success: false,
        message: "Failed to send OTP. Please try again.",
      };
    }
  } catch (error) {
    console.error("Send OTP error:", error);
    return {
      success: false,
      message: "An error occurred while sending OTP",
    };
  }
}

// ---------------------------------------------------------------------------------------------------
// verifyOtpAction.ts - verifying OTP
export async function verifyOtpAction(_prevState: any, formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const otp = formData.get("otp")?.toString().trim();

  if (!email || !emailRegex.test(email)) {
    return {
      success: false,
      verified: false,
      message: "Invalid email address",
    };
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    return {
      success: false,
      verified: false,
      message: "Please enter a valid 6-digit OTP",
    };
  }

  try {
    const result = await verifyOtpCode(email, otp);

    if (result.success) {
      return {
        success: true,
        verified: true,
        message: "Email verified successfully!",
      };
    } else {
      return {
        success: false,
        verified: false,
        message: "Invalid or expired OTP. Please try again.",
      };
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
    return {
      success: false,
      verified: false,
      message: "An error occurred while verifying OTP",
    };
  }
}

// ---------------------------------------------------------------------------------------------------
// check username exists in "users" database
async function checkUserExists(
  username: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API}/auth/check-user`, {
      method: "POST",
      body: JSON.stringify({
        username: username,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Error occured while checking username",
    };
  }
}
// ---------------------------------------------------------------------------------------------------
// check email exists in "users" database
async function checkEmailExists(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API}/auth/check-email`, {
      method: "POST",
      body: JSON.stringify({
        email: email,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Error occured while checking username",
    };
  }
}
// ---------------------------------------------------------------------------------------------------
// insert into "users" database
async function createUser(userData: {
  first_name: string | null;
  last_name: string | null;
  username: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API}/auth/create-user`, {
      method: "POST",
      body: JSON.stringify(userData),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: "Error occured while checking username",
    };
  }
}
