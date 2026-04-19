import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const DEPARTMENTS = [
  "Road",
  "Garbage",
  "Drainage",
  "Electricity",
  "Other"
];

const DEPARTMENT_KEYWORDS = {
  "Road": ["road", "roads", "pothole", "potholes", "pavement", "asphalt", "street", "highway", "surface", "damage", "crack", "repair", "lane"],
  "Garbage": ["garbage", "waste", "trash", "litter", "filth", "dump", "sanitation", "cleaning", "hygiene"],
  "Drainage": ["drainage", "drain", "water", "leak", "leakage", "pipe", "sewage", "tap", "supply", "pipeline", "stagnant", "flood"],
  "Electricity": ["power", "light", "electricity", "blackout", "outage", "bulb", "pole", "wire", "current", "volt", "electric"],
  "Other": ["other", "general", "misc"]
};

// Predict department from image using Groq
export async function predictDepartmentFromImage(imageUrl) {
  try {
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not configured. Skipping department prediction.');
      return null;
    }

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-2-vision-8b', // or another vision-capable model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: `Analyze this complaint image and determine which department should handle it. 
                Respond with ONLY the department name from this list: ${DEPARTMENTS.join(', ')}.
                If unsure, respond with the most likely department.
                Response format: Just the department name, nothing else.`
              }
            ]
          }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const predictedDept = response.data.choices?.[0]?.message?.content?.trim();
    
    // Validate the response is a valid department
    if (DEPARTMENTS.includes(predictedDept)) {
      return predictedDept;
    }

    // Fallback if Groq returns something unexpected
    return "Other";
  } catch (error) {
    console.error('Groq department prediction error:', error.message);
    return null;
  }
}

// Predict department from text description using Groq
export async function predictDepartmentFromText(text) {
  try {
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not configured. Using keyword fallback.');
      return predictDepartmentFromKeywords(text);
    }

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'mixtral-8x7b-32768', // Fast model for text
        messages: [
          {
            role: 'user',
            content: `Analyze this complaint text and determine which department should handle it.
            Complaint: "${text}"
            
            Available departments: ${DEPARTMENTS.join(', ')}
            
            Respond with ONLY the department name from the list above.
            If unsure, respond with the most likely department.
            Response format: Just the department name, nothing else.`
          }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const predictedDept = response.data.choices?.[0]?.message?.content?.trim();
    
    // Validate the response is a valid department
    if (DEPARTMENTS.includes(predictedDept)) {
      return predictedDept;
    }

    // Fallback to keyword matching
    return predictDepartmentFromKeywords(text);
  } catch (error) {
    console.error('Groq text department prediction error:', error.message);
    // Fallback to keyword matching on error
    return predictDepartmentFromKeywords(text);
  }
}

// Keyword-based fallback for department prediction
function predictDepartmentFromKeywords(text) {
  if (!text) return "Other";

  const lowerText = text.toLowerCase();
  const scores = {};

  // Initialize scores
  DEPARTMENTS.forEach(dept => {
    scores[dept] = 0;
  });

  // Count keyword matches
  Object.entries(DEPARTMENT_KEYWORDS).forEach(([dept, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        scores[dept] += 1;
      }
    });
  });

  // Find department with highest score
  const bestDept = Object.entries(scores).reduce((prev, current) => 
    current[1] > prev[1] ? current : prev
  );

  // Return department if score > 0, else Other
  return bestDept[1] > 0 ? bestDept[0] : "Other";
}

  const GRIEVANCE_TYPES = [
    'road',
    'garbage',
    'drainage',
    'electricity',
    'other'
  ];

  // Predict grievance type from image and description
  export async function predictGrievanceType(imageUrl, description) {
    try {
      if (!GROQ_API_KEY) {
        console.warn('GROQ_API_KEY not configured. Skipping grievance type prediction.');
        return null;
      }

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: 'llama-2-vision-8b',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                },
                {
                  type: 'text',
                  text: `Analyze this complaint image and description to determine the grievance type.
                  Description: "${description}"
                  Respond with ONLY the grievance type from this list: ${GRIEVANCE_TYPES.join(', ')}.
                  If unsure, respond with the most likely type.
                  Response format: Just the grievance type in lowercase with underscores, nothing else.`
                }
              ]
            }
          ],
          max_tokens: 50
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predicted = response.data.choices?.[0]?.message?.content?.trim().toLowerCase();
    
      // Validate the response is a valid grievance type
      if (GRIEVANCE_TYPES.includes(predicted)) {
        return predicted;
      }

      return null;
    } catch (error) {
      console.error('Groq grievance type prediction error:', error.message);
      return null;
    }
  }

  // Predict complaint title from image and description
  export async function predictComplaintTitle(imageUrl, description) {
    try {
      if (!GROQ_API_KEY) {
        console.warn('GROQ_API_KEY not configured. Skipping title prediction.');
        return null;
      }

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: 'llama-2-vision-8b',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                },
                {
                  type: 'text',
                  text: `Based on this image and description, generate a short, clear complaint title (max 50 characters).
                  Description: "${description}"
                  Respond with ONLY the title, no quotes, no explanation.
                  Make it specific and actionable.`
                }
              ]
            }
          ],
          max_tokens: 20
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const title = response.data.choices?.[0]?.message?.content?.trim();
    
      if (title && title.length > 0 && title.length <= 100) {
        return title;
      }

      return null;
    } catch (error) {
      console.error('Groq title prediction error:', error.message);
      return null;
    }
  }

// Predict complaint metadata (title, department, grievance type) from IVR transcript text
export async function predictComplaintMetadataFromText(text) {
  try {
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not configured. Using defaults for text metadata.');
      return {
        title: text.substring(0, 100) || 'IVR Complaint',
        department: 'Other',
        grievanceType: 'other'
      };
    }

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'user',
            content: `Analyze this IVR complaint transcript and extract metadata. Return ONLY a JSON object with these keys (no markdown, no extra text):
            {
              "title": "short, clear complaint title (max 50 chars)",
              "department": "one of: Road, Garbage, Drainage, Electricity, Other",
              "grievanceType": "one of: road, garbage, drainage, electricity, other"
            }
            
            Transcript: "${text}"
            
            Respond with ONLY valid JSON, nothing else.`
          }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return {
        title: text.substring(0, 100) || 'IVR Complaint',
        department: 'Other',
        grievanceType: 'other'
      };
    }

    try {
      const cleaned = content.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        title: parsed.title || 'IVR Complaint',
        department: DEPARTMENTS.includes(parsed.department) ? parsed.department : 'Other',
        grievanceType: parsed.grievanceType || 'other'
      };
    } catch (parseError) {
      console.warn('Failed to parse Groq JSON response:', parseError.message);
      return {
        title: text.substring(0, 100) || 'IVR Complaint',
        department: 'Other',
        grievanceType: 'other'
      };
    }
  } catch (error) {
    console.error('Groq complaint metadata prediction error:', error.message);
    return {
      title: text.substring(0, 100) || 'IVR Complaint',
      department: 'Other',
      grievanceType: 'other'
    };
  }
}
