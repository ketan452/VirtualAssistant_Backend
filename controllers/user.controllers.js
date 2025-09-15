import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import User from "../models/user.model.js";
import moment from "moment";

// Get current logged in user
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "get current user error" });
  }
};

// Update assistant name & image
export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;
    let assistantImage = imageUrl || null;
    if (req.file) {
      try {
        assistantImage = await uploadOnCloudinary(req.file.path);
      } catch (cloudErr) {
        console.error("Cloudinary upload failed:", cloudErr);
        assistantImage = null;
      }
    }

    const updateFields = { assistantName };
    if (assistantImage) updateFields.assistantImage = assistantImage;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateFields,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("updateAssistant error:", error);
    return res.status(400).json({ message: "updateAssistantError user error" });
  }
};

// Ask assistant
export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ response: "User not found" });

    user.history.push(command);
    await user.save();

    const userName = user.name;
    const assistantName = user.assistantName;

    const gemResult = await geminiResponse(command, assistantName, userName);

    if (!gemResult || !gemResult.type) {
      return res.status(400).json({ response: "Invalid Gemini response" });
    }

    const type = gemResult.type;

    switch (type) {
      case "get-date":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Current date is ${moment().format("YYYY-MM-DD")}`
        });
      case "get-time":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Current time is ${moment().format("hh:mm A")}`
        });
      case "get-day":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Today is ${moment().format("dddd")}`
        });
      case "get-month":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Current month is ${moment().format("MMMM")}`
        });
      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
      case "weather-show":
        return res.json(gemResult);

      default:
        return res.status(400).json({ response: "I didn't understand that command." });
    }

  } catch (error) {
    console.error("askToAssistant error:", error.message || error);
    return res.status(500).json({ response: "ask assistant error" });
  }
};
