"use server";
import { cookies } from "next/headers";
import { verifySession } from "../_lib/session";
import { sendOtpEmail, verifyOtpCode } from "@biswajitaich/email-auth";

const API = process.env.DOCKER_BACKEND_URL;

export async function deleteUserAction(id: number, username: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const session = verifySession(token);

    if (!session) {
      cookieStore.set("auth_token", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });
      return { success: false, message: "user login required !" };
    }

    console.log("Session from verifySession:", session);
    const resp = await fetch(`${API}/auth/delete-user`, {
      method: "POST",
      body: JSON.stringify({
        id: id,
        user_name: username,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) return { success: false, message: "HTTP error" };
    const deleted = await resp.json();
    if (!deleted.success) return { success: false, message: deleted.message };

    cookieStore.set("auth_token", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
    });
    return {
      success: true,
      message: "succesful.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Something went wrong.",
    };
  }
}

// sendOtpAction.ts - sending OTP to users provided email
export async function sendOtpAction(email: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    const session = verifySession(token);

    if (!session) {
      cookieStore.set("auth_token", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
      });
      return { success: false, message: "user login required !" };
    }

    console.log("Session from verifySession:", session);
    // const response = await fetch(`${API}/auth/check-email`, {
    //   method: "POST",
    //   body: JSON.stringify({
    //     email: email,
    //   }),
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    // });
    // const data = await response.json();

    // if (!data.success) {
    //   return {
    //     success: false,
    //     message: "Email not found.",
    //   };
    // }

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

// verifyOtpAction.ts - verifying OTP
export async function verifyOtpAction(email: string, otp: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const session = verifySession(token);

  if (!session) {
    cookieStore.set("auth_token", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
    });
    return { success: false, message: "user login required !" };
  }

  console.log("Session from verifySession:", session);

  if (!otp || !/^\d{6}$/.test(otp)) {
    return {
      success: false,
      message: "Please enter a valid 6-digit OTP",
    };
  }

  try {
    const result = await verifyOtpCode(email, otp);

    if (result.success) {
      return {
        success: true,
        message: "Email verified successfully!",
      };
    } else {
      return {
        success: false,
        message: "Invalid or expired OTP. Please try again.",
      };
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
    return {
      success: false,
      message: "An error occurred while verifying OTP",
    };
  }
}
