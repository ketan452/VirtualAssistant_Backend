import axios from "axios";

const geminiResponse = async (command, assistantName, userName) => {
  try {
    const apiUrl = process.env.GEMINI_API_URL;

    const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}.
Respond ONLY with a JSON object like:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month" | "calculator-open" | "instagram-open" | "facebook-open" | "weather-show",
  "userInput": "<user input>",
  "response": "<short spoken response>"
}

Only respond with JSON, nothing else.
User input: ${command}`;

    const result = await axios.post(apiUrl, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    let rawText = result.data.candidates[0].content.parts[0].text;

    // 🔹 Cleanup: remove ```json, ``` aur extra whitespace
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    // ✅ Safely parse JSON
    return JSON.parse(rawText);

  } catch (error) {
    console.log("Gemini API Error:", error.message || error);
    return {
      type: "general",
      userInput: command,
      response: "Sorry, I couldn't understand that."
    };
  }
};

export default geminiResponse;
