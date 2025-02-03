import { resend } from "@/lib/resend"
import VerificationEmail from "../../emails/verificationEmail"
import { ApiResponse } from "@/types/ApiResponse"

export async function sendVerificationEmail(
  email: string,
  username: string,
  verifyCode: string
): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Mystry message | Verification code",
      react: VerificationEmail({ username, otp: verifyCode }),
    })

    return { success: true, message: "Successfully send verification email." }
  } catch (emailError) {
    console.error("Error sendng verification email", emailError)
    return { success: false, message: "Failed to send verification email." }
  }
}
