// Subscription plans (prices in Pakistani Rupees).
export type Plan = {
  id: string;
  name: string;
  pricePkr: number;
  credits: number;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    pricePkr: 0,
    credits: 25,
    period: "forever",
    tagline: "Try it out",
    features: ["25 free messages", "Symptom guidance", "Lab photo explanations"],
  },
  {
    id: "basic",
    name: "Basic",
    pricePkr: 500,
    credits: 500,
    period: "/month",
    tagline: "For regular use",
    highlight: true,
    features: [
      "500 messages / month",
      "Image & file uploads",
      "Voice input & replies",
      "Doctor-ready summaries",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    pricePkr: 1500,
    credits: 5000,
    period: "/month",
    tagline: "Power users & families",
    features: [
      "5,000 messages / month",
      "Everything in Basic",
      "Priority responses",
      "Medication scheduling",
    ],
  },
];

export const getPlan = (id: string) => PLANS.find((p) => p.id === id);

export const formatPkr = (n: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);
