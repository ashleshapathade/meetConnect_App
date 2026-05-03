import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt, { hash } from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide correct Email and Password" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User Not Found" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (isPasswordCorrect) {
      let token = crypto.randomBytes(20).toString("hex");
      user.token = token;
      await user.save();
      return res.status(httpStatus.OK).json({
        token: token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "invalid username and password" });
    }
  } catch (e) {
    res.status(500).json({ message: `Something Went wrong ${e}` });
  }
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 🔒 1. Required field validation
    if (!name || !email || !password) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "All fields are required",
      });
    }

    // 📧 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid email format",
      });
    }

    // 🔑 3. Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message:
          "Password must be 8+ chars with uppercase, lowercase, number & special character",
      });
    }

    // 🔍 4. Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(httpStatus.CONFLICT).json({
        message: "User already exists",
      });
    }

    // 🔐 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 💾 6. Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // ✅ 7. Success response
    return res.status(httpStatus.CREATED).json({
      message: "User Registered Successfully",
    });
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const getUserHistory = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token: token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const meetings = await Meeting.find({
      $or: [{ user_id: user._id }, { user_id: user.email }],
    }).sort({ createdAt: -1 });

    const history = meetings.map((meeting) => ({
      meetingCode: meeting.meetingCode,
      link: meeting.link,
      createdAt: meeting.createdAt,
      date: meeting.createdAt,
      hostName: meeting.hostName,
    }));

    res.json(history);
  } catch (e) {
    res.status(500).json({ message: `Something went wrong ${e}` });
  }
};

//
const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;

  try {
    const user = await User.findOne({ token: token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const meeting = await Meeting.findOne({ meetingCode: meeting_code });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.status(200).json({
      meetingCode: meeting.meetingCode,
      link: meeting.link,
      createdAt: meeting.createdAt,
      date: meeting.createdAt,
      hostName: meeting.hostName,
    });
  } catch (e) {
    res.status(500).json({ message: `Something Went Wrong ${e}` });
  }
};

export { login, register, getUserHistory, addToHistory };
