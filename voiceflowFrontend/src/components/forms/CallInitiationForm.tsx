import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, User, Mail, Building, MapPin, Banknote, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CallInitiationFormProps {
  variant: "b2b" | "real-estate";
  onSubmit?: (data: FormData) => void;
}

interface FormData {
  phone: string;
  name: string;
  email: string;
  company?: string;
  budget?: string;
  location?: string;
  propertyType?: string;
  isRent?: boolean;
}

export function CallInitiationForm({ variant, onSubmit }: CallInitiationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    phone: "",
    name: "",
    email: "",
    company: "",
    budget: "",
    location: "",
    propertyType: "",
    isRent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success("Call initiated successfully!", {
      description: `Our AI agent will call you at ${formData.phone} shortly.`,
    });

    setIsSubmitting(false);
    onSubmit?.(formData);
  };

  const isPrimary = variant === "b2b";

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Phone Number */}
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
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">E.164 format recommended</p>
      </div>

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
      {variant === "b2b" && (
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
      {variant === "real-estate" && (
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

          <div className="space-y-2">
            <Label htmlFor="propertyType" className="text-foreground">
              Property Type *
            </Label>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Select
                value={formData.propertyType}
                onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
              >
                <SelectTrigger className="pl-10 bg-muted/50 border-border">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1bhk">1 BHK Apartment</SelectItem>
                  <SelectItem value="2bhk">2 BHK Apartment</SelectItem>
                  <SelectItem value="3bhk">3 BHK Apartment</SelectItem>
                  <SelectItem value="villa">Villa / Independent House</SelectItem>
                  <SelectItem value="plot">Plot / Land</SelectItem>
                  <SelectItem value="commercial">Commercial Space</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
            <div>
              <Label htmlFor="isRent" className="text-foreground font-medium">
                Looking to Rent?
              </Label>
              <p className="text-xs text-muted-foreground">Toggle on if you're looking to rent instead of buy</p>
            </div>
            <Switch
              id="isRent"
              checked={formData.isRent}
              onCheckedChange={(checked) => setFormData({ ...formData, isRent: checked })}
            />
          </div>
        </>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant={isPrimary ? "gradient" : "gradient-secondary"}
        size="xl"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Initiating Call...
          </>
        ) : (
          <>
            <Phone className="h-5 w-5" />
            {variant === "b2b" ? "Call Me Now – Test B2B Sales" : "Call Me Now – Real Estate Agent"}
          </>
        )}
      </Button>
    </motion.form>
  );
}
