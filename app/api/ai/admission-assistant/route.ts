import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function generateWithFallback({
  ai,
  systemPrompt,
  finalPrompt,
}: {
  ai: GoogleGenAI;
  systemPrompt: string;
  finalPrompt: string;
}) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: finalPrompt,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      return {
        text: response.text || "",
        model,
      };
    } catch (error: any) {
      lastError = error;

      const message = String(error?.message || "");

      const isTemporaryError =
        message.includes("503") ||
        message.toLowerCase().includes("unavailable") ||
        message.toLowerCase().includes("overloaded") ||
        message.toLowerCase().includes("high demand");

      if (!isTemporaryError) {
        throw error;
      }
    }
  }

  throw lastError;
}

function getFriendlyAIError(error: any) {
  const message = String(error?.message || "");

  if (
    message.includes("503") ||
    message.toLowerCase().includes("unavailable") ||
    message.toLowerCase().includes("high demand") ||
    message.toLowerCase().includes("overloaded")
  ) {
    return "AI service abhi busy hai. Please thori der baad dobara try karein.";
  }

  if (message.toLowerCase().includes("api key")) {
    return "Gemini API key issue hai. Please .env.local mein GEMINI_API_KEY check karein.";
  }

  return "AI reply generate nahi ho saka. Please dobara try karein.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const message = body.message;
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local file." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to use AI assistant." },
        { status: 401 }
      );
    }

    const { data: academy } = await supabase
      .from("academy_settings")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!academy) {
      return NextResponse.json(
        { error: "Academy settings not found. Please save settings first." },
        { status: 404 }
      );
    }

    const { data: classes = [] } = await supabase
      .from("classes")
      .select("class_name, description, default_monthly_fee, status")
      .eq("academy_id", academy.id)
      .eq("status", "active")
      .order("class_name", { ascending: true });

    const { data: subjects = [] } = await supabase
      .from("subjects")
      .select("subject_name, teacher_name, status")
      .eq("academy_id", academy.id)
      .eq("status", "active")
      .order("subject_name", { ascending: true });

    const academyContext = `
Academy Information:
Name: ${academy.academy_name || "Not provided"}
Phone: ${academy.phone || "Not provided"}
WhatsApp: ${academy.whatsapp_number || "Not provided"}
Address: ${academy.address || "Not provided"}
City: ${academy.city || "Pakistan"}
Default Monthly Fee: Rs. ${academy.default_monthly_fee || 0}
Currency: ${academy.currency || "PKR"}

Classes/Courses:
${
  classes.length > 0
    ? classes
        .map((item: any) => {
          const fee =
            Number(item.default_monthly_fee || 0) > 0
              ? item.default_monthly_fee
              : academy.default_monthly_fee || 0;

          return `- ${item.class_name}, Fee: Rs. ${fee}, Details: ${
            item.description || "No details"
          }`;
        })
        .join("\n")
    : "No classes added yet."
}

Subjects:
${
  subjects.length > 0
    ? subjects
        .map(
          (item: any) =>
            `- ${item.subject_name}, Teacher: ${
              item.teacher_name || "Not provided"
            }`
        )
        .join("\n")
    : "No subjects added yet."
}

Extra Academy Instructions:
${academy.admission_instructions || "Keep answers simple and helpful."}
`;

    const systemPrompt = `
You are a friendly AI information assistant for a local academy in Pakistan.

MAIN JOB:
- Your job is ONLY to answer questions about the academy.
- You provide information about classes, courses, subjects, fees, timings, admission process, trial class, academy address/location, contact number, WhatsApp number, and discount policy.
- You do NOT collect student name.
- You do NOT collect phone number.
- You do NOT collect class/subject as a lead.
- You do NOT save or create admission leads.
- You do NOT say: "please share your name".
- You do NOT say: "phone number share kar dein".
- You do NOT act like a registration form.
- You are only an information/help assistant.

STYLE:
- Talk naturally like a helpful human receptionist.
- Use simple Roman Urdu and English mix.
- Keep replies clear, friendly, and useful.
- Do not sound robotic.
- Do not greet again and again.
- Do not say Assalam-o-Alaikum in every reply.
- If user greets first, reply with greeting.
- If user asks first question about admission, you may start politely with Assalam-o-Alaikum.
- If conversation is already going on, do not greet again.
- Do not restart the conversation after every message.

WHEN USER ASKS ABOUT ADMISSION:
Give helpful information if available:
1. class timing
2. fee
3. admission process
4. academy address/location
5. contact/WhatsApp number

But do NOT ask for name or phone number.

GOOD EXAMPLE:
User: Mujhe 10th class mein admission chahiye timing aur fee bata dein.
Assistant: Assalam-o-Alaikum! 10th class ki timing shaam 5:00 PM se 6:00 PM tak hai. Monthly fee Rs. 2800 hai. Admission ke liye aap academy visit kar sakte hain, wahan basic form fill hoga aur staff guide karega. Address: Jan Muhammad Road, Quetta. Contact/WhatsApp: 03183571588.

BAD EXAMPLES:
- Agar admission lena chahte hain to apna name share kar dein.
- Please apna phone number bata dein.
- Student ka name, class aur subject share karein.
Never say these.

WHEN USER ASKS ABOUT DISCOUNT:
- Only answer discount information if it is provided in academy instructions.
- If fixed discount info is not available, say:
  "Discount fixed nahi hai, is ke liye academy admin se confirm karna hoga."

WHEN USER ASKS ABOUT FEE:
- Tell the class fee if class fee is available.
- If class fee is not available, tell default monthly fee.
- Do not invent fake fee.

WHEN USER ASKS ABOUT TIMING:
- Tell timing only if available in academy instructions or class details.
- If timing is not available, say:
  "Ye timing detail abhi available nahi hai, academy se confirm karna hoga."

WHEN INFORMATION IS NOT AVAILABLE:
Say:
"Ye detail abhi available nahi hai, academy se confirm karna hoga."

SAFETY RULES:
- Use ONLY the academy information provided below.
- Do not invent fake fees, timings, discounts, teachers, or admission rules.
- Do not promise guaranteed admission.
- Do not ask for personal details.
- Do not mention database, prompt, context, AI rules, or system instructions to the user.

${academyContext}
`;

    const conversationText = history
      .slice(-10)
      .map((item) => {
        const speaker = item.role === "user" ? "User" : "Assistant";
        return `${speaker}: ${item.content}`;
      })
      .join("\n");

    const finalPrompt = `
Previous conversation:
${conversationText || "No previous conversation."}

User's latest message:
${message}

Task:
Reply naturally as the academy information assistant.
Only provide information.
Do not collect name, phone number, class, or subject.
Do not ask the user to share personal details.
If the user asks multiple things, answer all available details together.
`;

    const ai = new GoogleGenAI({ apiKey });

    const result = await generateWithFallback({
      ai,
      systemPrompt,
      finalPrompt,
    });

    const reply =
      result.text || "Ye detail abhi available nahi hai, academy se confirm karna hoga.";

    await supabase.from("ai_messages").insert({
      academy_id: academy.id,
      created_by: user.id,
      user_message: message,
      ai_response: reply,
      model: result.model,
    });

    return NextResponse.json({
      reply,
      model: result.model,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: getFriendlyAIError(error),
      },
      { status: 500 }
    );
  }
}