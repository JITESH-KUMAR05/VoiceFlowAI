import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, User, Building2, MapPin, Wallet, Home, Globe, Mic } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// --- VOICE DATA ---
const VOICE_OPTIONS = [
  {
    language: "English - India",
    code: "en-IN",
    voices: [
      { id: "en-IN-anisha", name: "Anisha" },
      { id: "en-IN-anusha", name: "Anusha" },
      { id: "en-IN-nikhil", name: "Nikhil" },
      { id: "en-US-ronnie", name: "Ronnie" }, // Changed from en-IN-ronnie
      { id: "en-IN-samar", name: "Samar" },
      { id: "en-IN-tanushree", name: "Tanushree" },
    ]
  },
  {
    language: "Hindi - India",
    code: "hi-IN",
    voices: [
      { id: "hi-IN-aman", name: "Aman" },
      { id: "hi-IN-karan", name: "Karan" },
      { id: "hi-IN-khyati", name: "Khyati" },
      { id: "hi-IN-namrita", name: "Namrita" },
      { id: "hi-IN-sunaina", name: "Sunaina" },
      { id: "en-US-zion", name: "Zion" }, // Changed from hi-IN-zion
    ]
  },
  {
    language: "Telugu - India",
    code: "te-IN",
    voices: [
      { id: "en-US-josie", name: "Josie" }, // Changed from te-IN-josie
      { id: "en-US-ronnie", name: "Ronnie" }, // Changed from te-IN-ronnie
    ]
  },
  {
    language: "Punjabi - India",
    code: "pa-IN",
    voices: [
      { id: "en-US-alicia", name: "Alicia" }, // Changed from pa-IN-alicia
      { id: "pa-IN-harman", name: "Harman" },
      { id: "en-US-lia", name: "Lia" }, // Changed from pa-IN-lia
      { id: "en-US-zion", name: "Zion" }, // Changed from pa-IN-zion
    ]
  },
  {
    language: "Gujarati - India",
    code: "gu-IN",
    voices: [
      { id: "en-US-lia", name: "Lia" }, // Changed from gu-IN-lia
      { id: "en-US-ronnie", name: "Ronnie" }, // Changed from gu-IN-ronnie
    ]
  }
];

interface CallInitiationFormProps {
  variant: "b2b" | "real-estate";
  onSubmit?: (data: any) => void;
}

export function CallInitiationForm({ variant, onSubmit }: CallInitiationFormProps) {
  const [mode, setMode] = useState<"phone" | "browser">("phone");
  const [selectedLang, setSelectedLang] = useState("en-IN");
  
  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    email: "",
    company: "",
    budget: "",
    location: "",
    voice_id: "en-IN-anisha" // Default
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get voices for selected language
  const currentVoices = VOICE_OPTIONS.find(v => v.code === selectedLang)?.voices || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        phone_number: mode === "phone" ? formData.phone : null, // Null for browser
        lead_name: formData.name,
        lead_email: formData.email,
        lead_company: formData.company,
        agent_type: variant === "b2b" ? "b2b" : "real_estate",
        language: VOICE_OPTIONS.find(v => v.code === selectedLang)?.language || "English",
        voice_id: formData.voice_id,
        details: {
          budget: formData.budget,
          location: formData.location,
        }
      };

      const data = await api.startCall(payload);

      if (mode === "phone") {
        toast.success("Call Initiated", { description: "Your phone should ring shortly." });
      } else {
        toast.success("Session Started", { description: "Connecting to AI Agent..." });
        // Pass the session data back to parent to open the Live Interface
        onSubmit?.({ ...data, mode: "browser" }); 
      }

    } catch (error) {
      toast.error("Connection Failed", { description: "Check backend." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Mode Selection */}
      <div className="bg-muted/30 p-1 rounded-lg flex gap-1 mb-4">
        <Button
          type="button"
          variant={mode === "phone" ? "secondary" : "ghost"}
          className="flex-1 h-9"
          onClick={() => setMode("phone")}
        >
          <Phone className="w-4 h-4 mr-2" /> Phone Call
        </Button>
        <Button
          type="button"
          variant={mode === "browser" ? "secondary" : "ghost"}
          className="flex-1 h-9"
          onClick={() => setMode("browser")}
        >
          <Mic className="w-4 h-4 mr-2" /> Browser Demo
        </Button>
      </div>

      {/* Language & Voice Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Language</Label>
          <Select value={selectedLang} onValueChange={setSelectedLang}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>{lang.language}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Voice</Label>
          <Select 
            value={formData.voice_id} 
            onValueChange={(v) => setFormData({...formData, voice_id: v})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Common Fields */}
      <div className="space-y-2">
        <Label>Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9" 
            placeholder="Your Name"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required 
          />
        </div>
      </div>

      {/* Phone Number (Only for Phone Mode) */}
      {mode === "phone" && (
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9" 
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              required 
            />
          </div>
        </div>
      )}

      {/* Agent Specific Fields */}
      {variant === "real-estate" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9" 
                placeholder="Mumbai"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Budget</Label>
            <div className="relative">
              <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-9" 
                placeholder="2 Cr"
                value={formData.budget}
                onChange={e => setFormData({...formData, budget: e.target.value})}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Company</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9" 
              placeholder="Company Name"
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
            />
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Connecting..." : mode === "phone" ? "Call Me Now" : "Start Conversation"}
      </Button>
    </motion.form>
  );
}