import dbConnect from "@/lib/dbConnect" // Import function to establish a database connection.
import UserModel from "@/model/User" // Import the Mongoose model for the user schema.
import bcrypt from "bcryptjs" // Import bcrypt for password hashing.
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail" // Import helper to send verification emails.

export async function POST(request: Request) {
  await dbConnect() // Connect to the database before handling the request.

  try {
    // Extract data from the incoming JSON request body.
    const { username, email, password } = await request.json()

    // Check if a verified user already exists with the given username.
    const existingUserVerifiedByUsername = await UserModel.findOne({
      username,
      isVerified: true, // Look for verified users only.
    })

    // If a verified user exists with the same username, respond with an error.
    if (existingUserVerifiedByUsername) {
      return Response.json(
        {
          success: false,
          message: "Username is already taken",
        },
        { status: 400 }
      )
    }

    // Check if any user exists with the same email.
    const existingUserByEmail = await UserModel.findOne({ email })

    // Generate a 6-digit verification code.
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString()

    if (existingUserByEmail) {
      // If a user exists with the given email, check if they are verified.
      if (existingUserByEmail.isVerified) {
        return Response.json(
          {
            success: false,
            message: "User already exists with this email.",
          },
          { status: 400 }
        )
      } else {
        // Update the unverified user's password, verification code, and expiry.
        const hashedPassword = await bcrypt.hash(password, 10) // Hash the new password.
        existingUserByEmail.password = hashedPassword
        existingUserByEmail.verifyCode = verifyCode
        existingUserByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000) // Set expiry to 1 hour from now.
        await existingUserByEmail.save() // Save the updated user document.
      }
    } else {
      // If the user doesn't exist, create a new user record.
      const hashedPassword = await bcrypt.hash(password, 10) // Hash the password.
      const expiryDate = new Date()
      expiryDate.setHours(expiryDate.getHours() + 1) // Set verification code expiry to 1 hour.

      // Create and save a new user document.
      const newUser = new UserModel({
        username,
        email,
        password: hashedPassword,
        verifyCode,
        verifyCodeExpiry: expiryDate,
        isVerified: false, // Mark the user as unverified initially.
        isAcceptingMessages: true,
        messages: [],
      })

      await newUser.save() // Save the new user document.
    }

    // Send the verification email.
    const emailResponse = await sendVerificationEmail(
      email,
      username,
      verifyCode
    )

    // Check if the email sending failed.
    if (!emailResponse.success) {
      return Response.json(
        {
          success: false,
          message: emailResponse.message,
        },
        { status: 500 }
      )
    }

    // Respond with success if registration and email sending succeed.
    return Response.json(
      {
        success: true,
        message: "User registered successfully. Please verify your email.",
      },
      { status: 201 }
    )
  } catch (error) {
    // Log the error and respond with a server error message.
    console.error("Error registering user", error)
    return Response.json(
      {
        success: false,
        message: "Error registering user",
      },
      {
        status: 500,
      }
    )
  }
}
