import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, User, Mail, Building, MapPin, Banknote, Home, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AgentType } from "@/types/agent";
import { TestMode } from "./TestModeSelector";
import { AIConfig, AIConfigForm } from "./AIConfigForm";

interface TestFormProps {
  agentType: AgentType;
  testMode: TestMode;
  onSubmit?: (data: any) => void;
}

export function TestForm({ agentType, testMode, onSubmit }: TestFormProps) {
  const [formData, setFormData] = useState({
    phone: "",
    name: "",
    email: "",
    company: "",
    budget: "",
    location: "",
    propertyType: "",
    isRent: false,
  });

  const [aiConfig, setAIConfig] = useState<AIConfig>({
    language: "en-IN",
    voice: "en-IN-anisha",
    model: "gpt-4o",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPrimary = agentType === "b2b";
  const requiresPhone = testMode === "phone";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Construct Payload
      const payload = {
        phone_number: requiresPhone ? formData.phone : null,
        lead_name: formData.name,
        lead_email: formData.email,
        lead_company: formData.company,
        agent_type: agentType,
        language: aiConfig.language,
        voice_id: aiConfig.voice,
        details: agentType === "real-estate" ? {
          budget: formData.budget,
          location: formData.location,
          property_type: formData.propertyType,
          is_rent: formData.isRent,
        } : {}
      };

      // 2. Call Backend
      const data = await api.startCall(payload);

      // 3. Handle Success
      if (testMode === "phone") {
        toast.success("Call initiated successfully!", {
          description: `Calling ${formData.phone}...`,
        });
      } else {
        toast.success("Session Started!", {
          description: "Connecting to AI Agent...",
        });
        // Pass backend data (session_id, audio_url) to parent
        onSubmit?.({ ...data, lead_name: formData.name, language: aiConfig.language });
      }

    } catch (error) {
      console.error(error);
      toast.error("Connection Failed", {
        description: "Could not connect to the backend server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* AI Configuration */}
      <AIConfigForm config={aiConfig} onChange={setAIConfig} />

      {/* Phone Number - Only for Phone Testing */}
      {requiresPhone && (
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-foreground">
            Phone Number *
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="pl-10 bg-muted/50 border-border focus:border-primary"
              required={requiresPhone}
            />
          </div>
        </div>
      )}

      {/* Lead Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-foreground">
          Lead Name *
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="pl-10 bg-muted/50 border-border focus:border-primary"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">
          Email Address *
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="john@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="pl-10 bg-muted/50 border-border focus:border-primary"
            required
          />
        </div>
      </div>

      {/* B2B Specific: Company Name */}
      {agentType === "b2b" && (
        <div className="space-y-2">
          <Label htmlFor="company" className="text-foreground">
            Company Name
          </Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="company"
              type="text"
              placeholder="Acme Inc."
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="pl-10 bg-muted/50 border-border focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Real Estate Specific Fields */}
      {agentType === "real-estate" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-foreground">
              Budget Range *
            </Label>
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Select
                value={formData.budget}
                onValueChange={(value) => setFormData({ ...formData, budget: value })}
              >
                <SelectTrigger className="pl-10 bg-muted/50 border-border">
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under-50L">Under ₹50 Lakhs</SelectItem>
                  <SelectItem value="50L-1Cr">₹50 Lakhs - ₹1 Crore</SelectItem>
                  <SelectItem value="1Cr-2Cr">₹1 Crore - ₹2 Crore</SelectItem>
                  <SelectItem value="2Cr-5Cr">₹2 Crore - ₹5 Crore</SelectItem>
                  <SelectItem value="above-5Cr">Above ₹5 Crore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">
              Preferred Location *
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                type="text"
                placeholder="Mumbai, Bangalore, etc."
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="pl-10 bg-muted/50 border-border focus:border-primary"
                required
              />
            </div>
          </div>
        </>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="default"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            {testMode === "phone" ? "Initiating Call..." : "Starting Session..."}
          </>
        ) : (
          <>
            {testMode === "phone" ? (
              <>
                <Phone className="h-5 w-5 mr-2" />
                {agentType === "b2b" ? "Call Me Now" : "Call Me Now"}
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Start Browser Session
              </>
            )}
          </>
        )}
      </Button>
    </motion.form>
  );
}