// Translation cache to avoid repeated API calls
const translationCache = new Map();

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

// English to Gujarati translations dictionary (hardcoded for common terms for faster performance)
const GUJARATI_DICTIONARY = {
  // Navigation & Headers
  "Register New Complaint": "નવી ફરિયાદ નોંધાવો",
  "Citizen Workspace": "નાગરિક કાર્યક્ષેત્ર",
  "Officer Workspace": "અધિકારી કાર્યક્ષેત્ર",
  "Admin Workspace": "વ્યવસ્થાપક કાર્યક્ષેત્ર",
  
  // Buttons & Actions
  "Submit": "સબમિટ કરો",
  "Reset": "રીસેટ કરો",
  "Login": "લૉગઇન",
  "Signup": "નોંધણી કરો",
  "Logout": "લૉગઆઉટ",
  "Send": "મોકલો",
  "Cancel": "રદ્દ કરો",
  "Save": "સાચવો",
  "Delete": "કાઢી નાખો",
  "Edit": "સંપાદિત કરો",
  "Update": "અપડેટ કરો",
  "Back": "પાછળ",
  "Next": "આગળ",
  "Previous": "પાછલું",
  
  // Form Fields
  "Complaint Title": "ફરિયાદ શીર્ષક",
  "Description": "વર્ણન",
  "Department": "વિભાગ",
  "Grievance Type": "ફરિયાદનો પ્રકાર",
  "Location": "સ્થાન",
  "Email": "ઈમેલ",
  "Password": "પાસવર્ડ",
  "Mobile Number": "મોબાઇલ નંબર",
  "Name": "નામ",
  
  // Departments
  "Electricity": "વીજળી",
  "Sanitation": "સાફસફાઈ",
  "Water": "જળ",
  "Roads": "રોડ્સ",
  
  // Status Messages
  "Pending": "બાકી",
  "Verified": "સત્યાપિત",
  "Resolved": "હલ કરવામાં આવ્યું",
  "Reopened": "ફરીથી ખોલવામાં આવ્યું",
  "Failed": "નિષ્ફળ",
  "In Progress": "પ્રોગ્રેસમાં",
  
  // Messages
  "Success": "સફળતા",
  "Error": "ભૂલ",
  "Warning": "ચેતવણી",
  "Loading": "લોડ થઇ રહ્યું છે",
  "Please wait": "કૃપા કરીને રાહ જુઓ",
  "Are you sure?": "શું તમે ચોક્કસ છો?",
  
  // Validation Messages
  "This field is required": "આ ક્ષેત્ર આવશ્યક છે",
  "Invalid email": "અમાન્ય ઈમેલ",
  "Password must be at least 6 characters": "પાસવર્ડ ઓછામાં ઓછા 6 અક્ષર હોવો જોઈએ",
  
  // Image Upload
  "Upload geo-tagged complaint image": "જીઓ-ટેગ કરેલી ફરિયાદ ઇમેજ અપલોડ કરો",
  "Image and location are mandatory for this mode": "આ મોડ માટે ઇમેજ અને સ્થાન ફરજિયાત છે",
  "Choose Image": "ઇમેજ પસંદ કરો",
  "GPS Validated": "જીપીએસ સત્યાપિત",
  "Image contains valid GPS (EXIF) data": "ઇમેજમાં માન્ય જીપીએસ (EXIF) ડેટા છે",
  "GPS Validation Failed": "જીપીએસ સત્યાપન નિષ્ફળ",
  "Image does not contain GPS (EXIF) data": "ઇમેજમાં જીપીએસ (EXIF) ડેટા નથી",
  
  // Text Mode
  "Text-based complaint": "ટેક્સ્ટ આધારિત ફરિયાદ",
  "Register a complaint using text only": "માત્ર ટેક્સ્ટ દ્વારા ફરિયાદ નોંધાવો",
  "This intake path is text based": "આ ઈનટેક પાથ ટેક્સ્ટ આધારિત છે",
  
  // Dashboard
  "Assigned Complaints": "સોંપાયેલી ફરિયાદો",
  "Resolved": "હલ કરવામાં આવ્યું",
  "Awaiting Verification": "સત્યાપનની રાહમાં",
  "Verified Grievance Analytics": "સત્યાપિત ફરિયાદ વિશ્લેષણ",
  "Total Complaints": "કુલ ફરિયાદો",
  
  // District/Location
  "Filter by District": "જિલ્લા દ્વારા ફિલ્ટર કરો",
  "Filter by Department": "વિભાગ દ્વારા ફિલ્ટર કરો",
  "All Districts": "બધા જિલ્લા",
  "All Departments": "બધા વિભાગો",
};

export async function translateText(text, targetLanguage = "gu") {
  if (targetLanguage === "en") {
    return text; // No translation needed
  }

  if (targetLanguage !== "gu") {
    console.warn(`Unsupported language: ${targetLanguage}`);
    return text;
  }

  // Check cache first
  const cacheKey = `${text}_${targetLanguage}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Check hardcoded dictionary
  if (GUJARATI_DICTIONARY[text]) {
    translationCache.set(cacheKey, GUJARATI_DICTIONARY[text]);
    return GUJARATI_DICTIONARY[text];
  }

  // If not in dictionary, try to get translation from backend/Groq
  try {
    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translated = data.translatedText || text;
    
    // Cache the result
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text as fallback
    return text;
  }
}

// Batch translate multiple texts
export async function translateTexts(texts, targetLanguage = "gu") {
  return Promise.all(texts.map((text) => translateText(text, targetLanguage)));
}

// Get all translations for the hardcoded dictionary
export function getGujaratiDictionary() {
  return GUJARATI_DICTIONARY;
}
