import express from "express";
import { Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
const router = express.Router();

// CREATE MEETING

router.post("/create", async (req, res) => {
  try {
    const { meetingCode, user_id, hostName } = req.body;

    console.log("CREATE MEETING REQUEST:", req.body);

    if (!meetingCode) {
      return res.status(400).json({ message: "Meeting code is required" });
    }

    const existing = await Meeting.findOne({ meetingCode });
    if (existing) {
      return res.status(400).json({ message: "Meeting already exists" });
    }

    let finalHostName = hostName || "Host";
    if (user_id) {
      const user = await User.findById(user_id).catch(() => null);
      if (user) {
        finalHostName = user.name;
      } else {
        console.warn("Meeting create: user not found for user_id", user_id);
      }
    }

    const meeting = await Meeting.create({
      meetingCode,
      user_id: user_id || null,
      hostName: finalHostName,
      link: `http://localhost:3000/meeting/${meetingCode}`,
    });

    console.log("MEETING CREATED:", meeting);
    res.status(201).json(meeting);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      meetingCode: req.params.id,
    });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json({
      meetingCode: meeting.meetingCode,
      host: meeting.hostName, // ✅ now real name
      hostUserId: meeting.user_id,
      link: `http://localhost:3000/meeting/${meeting.meetingCode}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/join", async (req, res) => {
  try {
    const { meetingCode, userName } = req.body;

    if (!meetingCode || !userName) {
      return res.status(400).json({
        message: "Meeting code and username required",
      });
    }

    const meeting = await Meeting.findOne({ meetingCode });

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }

    return res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;
