import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation and UI
      language_changed: "Language changed",
      language_changed_to_english: "Language changed to English",
      language_changed_to_hindi: "भाषा बदलकर हिंदी कर दी गई है",

      // Emergency Blood Request
      need_blood: "Need Blood / रक्त चाहिए",
      emergency_description: "Press the button to request blood immediately",
      emergency_activated: "Emergency request activated",

      // Location
      detecting_location: "Detecting your location...",
      location_found: "Location found successfully",
      location_error: "Unable to get your location. Please enable location services.",
      location_detected: "Your location has been detected",
      location_required: "Location is required",
      retry: "Retry",
      back: "Back",
      continue: "Continue",

      // Form
      confirm_details: "Please confirm your details",
      your_name: "Your Name",
      enter_name: "Enter your full name",
      phone_number: "Phone Number",
      blood_type: "Blood Type",
      urgency_level: "Urgency Level",
      patient_condition: "Patient Condition (Optional)",
      describe_condition: "Briefly describe the patient's condition",
      optional: "Optional",
      name_required: "Name is required",
      phone_required: "Phone number is required",
      phone_invalid: "Invalid phone number format",
      form_error: "Please fill in all required fields",
      send_request: "Send Emergency Request",
      form_submitting: "Form is being submitted",
      form_cancelling: "Form submission cancelled",
      form_cleared: "Form cleared",

      // Urgency levels
      critical: "Critical",
      urgent: "Urgent",
      normal: "Normal",

      // Request submission
      sending_request: "Sending emergency request...",
      contacting_hospitals: "Contacting nearby hospitals...",
      request_sent: "Emergency Request Sent!",
      hospitals_notified: "Nearby hospitals have been notified",
      request_id: "Request ID",
      estimated_response: "Estimated response time",
      minutes: "minutes",
      new_request: "Create New Request",
      request_sent_success: "Your emergency blood request has been sent successfully",
      request_failed: "Failed to send request. Please try again.",
      request_error: "An error occurred while sending your request",

      // Voice Navigation
      voice_welcome: "Welcome to OneBlood. I can help you navigate using voice commands.",
      voice_listening: "Listening...",
      voice_speaking: "Speaking...",
      voice_ready: "Voice ready",
      voice_not_supported: "Voice navigation is not supported on this device",
      voice_listening_started: "Voice recognition started",
      voice_listening_stopped: "Voice recognition stopped",
      start_listening: "Start Listening",
      stop_listening: "Stop Listening",
      volume: "Volume",
      speed: "Speed",
      voice_muted: "Voice muted",
      voice_unmuted: "Voice unmuted",
      volume_set: "Volume set to {{volume}} percent",
      you_said: "You said",
      last_command: "Last command",
      voice_command_not_recognized: "Command '{{command}}' not recognized. Please try again.",
      voice_help: "Voice Help",
      voice_help_instructions: "Available commands: home, donor registration, hospital dashboard, emergency, back, help, submit, cancel, clear, language English, language Hindi, volume up, volume down, mute, unmute",
      navigating_to: "Navigating to {{destination}}",

      // Navigation destinations
      home: "Home",
      donor: "Donor Registration",
      hospital: "Hospital Dashboard",
      emergency: "Emergency Request",

      // Emergency Instructions
      emergency_instructions: "Emergency Instructions",
      instruction_1: "Press the red button to immediately request blood",
      instruction_2: "Enable location services for faster response",
      instruction_3: "Keep your phone nearby for hospital calls",

      // General
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      submit: "Submit",
      close: "Close"
    }
  },

  hi: {
    translation: {
      // Navigation and UI
      language_changed: "भाषा बदली गई",
      language_changed_to_english: "Language changed to English",
      language_changed_to_hindi: "भाषा बदलकर हिंदी कर दी गई है",

      // Emergency Blood Request
      need_blood: "रक्त चाहिए / Need Blood",
      emergency_description: "तुरंत रक्त के लिए बटन दबाएं",
      emergency_activated: "आपातकालीन अनुरोध सक्रिय किया गया",

      // Location
      detecting_location: "आपका स्थान जाना जा रहा है...",
      location_found: "स्थान सफलतापूर्वक मिल गया",
      location_error: "आपका स्थान प्राप्त करने में असमर्थ। कृपया लोकेशन सेवाएं सक्षम करें।",
      location_detected: "आपका स्थान पता लगाया गया है",
      location_required: "स्थान आवश्यक है",
      retry: "पुन: प्रयास करें",
      back: "पीछे",
      continue: "आगे बढ़ें",

      // Form
      confirm_details: "कृपया अपना विवरण पुष्टि करें",
      your_name: "आपका नाम",
      enter_name: "अपना पूरा नाम दर्ज करें",
      phone_number: "फोन नंबर",
      blood_type: "रक्त समूह",
      urgency_level: "तात्कालिकता स्तर",
      patient_condition: "रोगी की स्थिति (वैकल्पिक)",
      describe_condition: "रोगी की स्थिति का संक्षिप्त वर्णन करें",
      optional: "वैकल्पिक",
      name_required: "नाम आवश्यक है",
      phone_required: "फोन नंबर आवश्यक है",
      phone_invalid: "अमान्य फोन नंबर प्रारूप",
      form_error: "कृपया सभी आवश्यक फ़ील्ड भरें",
      send_request: "आपातकालीन अनुरोध भेजें",
      form_submitting: "फॉर्म सबमिट किया जा रहा है",
      form_cancelling: "फॉर्म सबमिशन रद्द किया गया",
      form_cleared: "फॉर्म साफ़ किया गया",

      // Urgency levels
      critical: "गंभीर",
      urgent: "तत्काल",
      normal: "सामान्य",

      // Request submission
      sending_request: "आपातकालीन अनुरोध भेजा जा रहा है...",
      contacting_hospitals: "नजदीकी अस्पतालों से संपर्क किया जा रहा है...",
      request_sent: "आपातकालीन अनुरोध भेजा गया!",
      hospitals_notified: "नजदीकी अस्पतालों को सूचित कर दिया गया है",
      request_id: "अनुरोध ID",
      estimated_response: "अनुमानित प्रतिक्रिया समय",
      minutes: "मिनट",
      new_request: "नया अनुरोध बनाएं",
      request_sent_success: "आपका आपातकालीन रक्त अनुरोध सफलतापूर्वक भेजा गया है",
      request_failed: "अनुरोध भेजने में असफल। कृपया पुन: प्रयास करें।",
      request_error: "आपका अनुरोध भेजते समय एक त्रुटि हुई",

      // Voice Navigation
      voice_welcome: "वनब्लड में आपका स्वागत है। मैं आपको वॉयस कमांड का उपयोग करके नेविगेट करने में मदद कर सकता हूं।",
      voice_listening: "सुन रहे हैं...",
      voice_speaking: "बोल रहे हैं...",
      voice_ready: "वॉयस तैयार",
      voice_not_supported: "इस डिवाइस पर वॉयस नेविगेशन समर्थित नहीं है",
      voice_listening_started: "वॉयस पहचान शुरू हो गई",
      voice_listening_stopped: "वॉयस पहचान रोक दी गई",
      start_listening: "सुनना शुरू करें",
      stop_listening: "सुनना बंद करें",
      volume: "आवाज़",
      speed: "गति",
      voice_muted: "आवाज़ म्यूट की गई",
      voice_unmuted: "आवाज़ अनम्यूट की गई",
      volume_set: "आवाज़ {{volume}} प्रतिशत पर सेट की गई",
      you_said: "आपने कहा",
      last_command: "अंतिम कमांड",
      voice_command_not_recognized: "कमांड '{{command}}' पहचाना नहीं गया। कृपया पुन: प्रयास करें।",
      voice_help: "वॉयस सहायता",
      voice_help_instructions: "उपलब्ध कमांड: होम, दाता पंजीकरण, अस्पताल डैशबोर्ड, आपातकाल, पीछे, मदद, सबमिट, रद्द करें, साफ़ करें, भाषा अंग्रेजी, भाषा हिंदी, वॉल्यूम अप, वॉल्यूम डाउन, म्यूट, अनम्यूट",
      navigating_to: "{{destination}} पर नेविगेट कर रहे हैं",

      // Navigation destinations
      home: "होम",
      donor: "दाता पंजीकरण",
      hospital: "अस्पताल डैशबोर्ड",
      emergency: "आपातकालीन अनुरोध",

      // Emergency Instructions
      emergency_instructions: "आपातकालीन निर्देश",
      instruction_1: "तुरंत रक्त के लिए लाल बटन दबाएं",
      instruction_2: "तेजी से प्रतिक्रिया के लिए लोकेशन सेवाएं सक्षम करें",
      instruction_3: "अस्पताल कॉल के लिए अपना फोन पास रखें",

      // General
      loading: "लोड हो रहा है...",
      error: "त्रुटि",
      success: "सफलता",
      cancel: "रद्द करें",
      submit: "सबमिट करें",
      close: "बंद करें"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;