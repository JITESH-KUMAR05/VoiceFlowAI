import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Mic, Cpu } from "lucide-react";

export interface AIConfig {
  language: string;
  voice: string;
  model: string;
}

interface AIConfigFormProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}

// [FIX] Updated Languages List
const languages = [
  { value: "en-IN", label: "English - India" },
  { value: "hi-IN", label: "Hindi - India" },
  { value: "te-IN", label: "Telugu - India" },
  { value: "pa-IN", label: "Punjabi - India" },
  { value: "gu-IN", label: "Gujarati - India" },
];

// [FIX] Updated Voices List based on your JSON
const voicesByLanguage: Record<string, { value: string; label: string }[]> = {
  "en-IN": [
    { value: "en-IN-anisha", label: "Anisha" },
    { value: "en-IN-anusha", label: "Anusha" },
    { value: "en-IN-nikhil", label: "Nikhil" },
    { value: "en-IN-ronnie", label: "Ronnie" },
    { value: "en-IN-samar", label: "Samar" },
    { value: "en-IN-tanushree", label: "Tanushree" },
  ],
  "hi-IN": [
    { value: "hi-IN-aman", label: "Aman" },
    { value: "hi-IN-karan", label: "Karan" },
    { value: "hi-IN-khyati", label: "Khyati" },
    { value: "hi-IN-namrita", label: "Namrita" },
    { value: "hi-IN-sunaina", label: "Sunaina" },
    { value: "hi-IN-zion", label: "Zion" },
  ],
  "te-IN": [
    { value: "te-IN-josie", label: "Josie" },
    { value: "te-IN-ronnie", label: "Ronnie" },
  ],
  "pa-IN": [
    { value: "pa-IN-alicia", label: "Alicia" },
    { value: "pa-IN-harman", label: "Harman" },
    { value: "pa-IN-lia", label: "Lia" },
    { value: "pa-IN-zion", label: "Zion" },
  ],
  "gu-IN": [
    { value: "gu-IN-lia", label: "Lia" },
    { value: "gu-IN-ronnie", label: "Ronnie" },
  ],
};

const models = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

export function AIConfigForm({ config, onChange }: AIConfigFormProps) {
  // Default to English if language not found
  const availableVoices = voicesByLanguage[config.language] || voicesByLanguage["en-IN"];

  const handleLanguageChange = (language: string) => {
    const newVoices = voicesByLanguage[language] || voicesByLanguage["en-IN"];
    onChange({
      ...config,
      language,
      voice: newVoices[0]?.value || "",
    });
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Cpu className="h-4 w-4 text-primary" />
        AI Configuration
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Language */}
        <div className="space-y-2">
          <Label className="text-foreground text-xs flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5" />
            Language
          </Label>
          <Select value={config.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice */}
        <div className="space-y-2">
          <Label className="text-foreground text-xs flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            Voice
          </Label>
          <Select 
            value={config.voice} 
            onValueChange={(v) => onChange({ ...config, voice: v })}
          >
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {availableVoices.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  {voice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label className="text-foreground text-xs flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            Model
          </Label>
          <Select 
            value={config.model} 
            onValueChange={(m) => onChange({ ...config, model: m })}
          >
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}