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

const languages = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
  { value: "ta", label: "Tamil" },
  { value: "kn", label: "Kannada" },
];

const voicesByLanguage: Record<string, { value: string; label: string }[]> = {
  en: [
    { value: "en-IN-priya", label: "Priya (Female)" },
    { value: "en-IN-rahul", label: "Rahul (Male)" },
    { value: "en-IN-ananya", label: "Ananya (Female)" },
  ],
  hi: [
    { value: "hi-IN-kavya", label: "Kavya (Female)" },
    { value: "hi-IN-arjun", label: "Arjun (Male)" },
  ],
  te: [
    { value: "te-IN-sai", label: "Sai (Male)" },
    { value: "te-IN-lakshmi", label: "Lakshmi (Female)" },
  ],
  ta: [
    { value: "ta-IN-karthik", label: "Karthik (Male)" },
    { value: "ta-IN-priya", label: "Priya (Female)" },
  ],
  kn: [
    { value: "kn-IN-vijay", label: "Vijay (Male)" },
    { value: "kn-IN-divya", label: "Divya (Female)" },
  ],
};

const models = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export function AIConfigForm({ config, onChange }: AIConfigFormProps) {
  const availableVoices = voicesByLanguage[config.language] || voicesByLanguage.en;

  const handleLanguageChange = (language: string) => {
    const newVoices = voicesByLanguage[language] || voicesByLanguage.en;
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
            onValueChange={(voice) => onChange({ ...config, voice })}
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
            onValueChange={(model) => onChange({ ...config, model })}
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
