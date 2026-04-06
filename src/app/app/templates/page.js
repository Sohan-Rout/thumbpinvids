"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Wand2,
  ShoppingBag,
  Star,
  PackageOpen,
  BookOpen,
  Tag,
  Megaphone,
  Heart,
  Sparkles,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "product-review", label: "Product Review", icon: Star },
  { id: "testimonial", label: "Testimonial", icon: Heart },
  { id: "unboxing", label: "Unboxing", icon: PackageOpen },
  { id: "how-to", label: "How-To", icon: BookOpen },
  { id: "sale", label: "Sale / Offer", icon: Tag },
  { id: "brand-intro", label: "Brand Intro", icon: Megaphone },
];

const TEMPLATES = [
  {
    id: "t1",
    name: "Skincare Product Review",
    category: "product-review",
    description: "Perfect for beauty & skincare brands",
    script:
      "Have you been struggling with dull skin? 😍 I tried this amazing Vitamin C serum and oh my god — my skin started glowing in just 7 days! It's lightweight, non-sticky, and perfect for Indian skin. Trust me, you need this in your routine. Link in bio — use code GLOW20 for 20% off!",
    recommended_voice: "Mumbai Female",
    recommended_avatar: "North Indian Female",
    tone: "excited",
    emoji: "✨",
    color: "from-pink-500/20 to-purple-500/20",
  },
  {
    id: "t2",
    name: "Protein Supplement Testimonial",
    category: "testimonial",
    description: "Ideal for fitness & health products",
    script:
      "Okay so I've been using this protein powder for 3 months now and the results are insane 💪 As an Indian vegetarian, finding good protein was always a struggle. But this one tastes amazing with milk, mixes well, and no bloating at all. My gym progress has been next level since I started. Try it — code FIT20 for 20% off!",
    recommended_voice: "Delhi Male",
    recommended_avatar: "North Indian Male",
    tone: "friendly",
    emoji: "💪",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    id: "t3",
    name: "Gadget Unboxing",
    category: "unboxing",
    description: "Great for tech & electronics",
    script:
      "Unboxing the most viral product of 2025! 🔥 Look at this packaging — so premium! Inside we've got the device, charging cable, and a surprise accessory. First impressions? The quality is honestly mind-blowing for this price. Let me show you what it can do. Comment below if you want a detailed review!",
    recommended_voice: "Bangalore Female",
    recommended_avatar: "South Indian Female",
    tone: "excited",
    emoji: "📦",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    id: "t4",
    name: "Hair Care Routine",
    category: "how-to",
    description: "Step-by-step product demo",
    script:
      "5 steps to get salon-like hair at home! Step 1: Use this sulphate-free shampoo. Step 2: Apply the hair mask for 10 minutes. Step 3: Rinse with cold water. Step 4: Apply 2 drops of this argan oil. Step 5: Air dry — no heat! The results will shock you. Products linked in bio! 💇‍♀️",
    recommended_voice: "Chennai Female",
    recommended_avatar: "South Indian Female",
    tone: "professional",
    emoji: "💇‍♀️",
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    id: "t5",
    name: "Flash Sale Announcement",
    category: "sale",
    description: "Create urgency for limited offers",
    script:
      "🚨 FLASH SALE ALERT! For the next 24 hours only — flat 50% off on everything! This is not a drill. Our bestsellers are selling out FAST. I just grabbed 3 things — the serum, the moisturizer, and the lip tint. All for under ₹999! Don't miss this. Link in bio. Hurry — stock is limited! 🚨",
    recommended_voice: "Mumbai Male",
    recommended_avatar: "North Indian Male",
    tone: "excited",
    emoji: "🚨",
    color: "from-red-500/20 to-rose-500/20",
  },
  {
    id: "t6",
    name: "Brand Story Introduction",
    category: "brand-intro",
    description: "Introduce your brand to new audiences",
    script:
      "Hi! I'm the founder of [Brand Name] and here's why I started this. 🇮🇳 Growing up in India, I couldn't find products that actually worked for our skin tone and climate. So I created my own. Every product is made with Indian ingredients — turmeric, neem, saffron. No chemicals, no compromise. Join 50,000+ happy customers. Link in bio!",
    recommended_voice: "Delhi Female",
    recommended_avatar: "North Indian Female",
    tone: "calm",
    emoji: "🇮🇳",
    color: "from-violet-500/20 to-indigo-500/20",
  },
  {
    id: "t7",
    name: "Food Product Review",
    category: "product-review",
    description: "Perfect for food & snack brands",
    script:
      "I found the BEST healthy snack for chai time! 🍵 These makhana chips are roasted, not fried — only 90 calories per pack. They come in 5 flavours — my favourite is peri peri. Perfect for office, gym bag, or binge-watching. And they actually taste incredible. Use code SNACK15 for 15% off. Link in bio!",
    recommended_voice: "Pune Female",
    recommended_avatar: "Marathi Female",
    tone: "friendly",
    emoji: "🍵",
    color: "from-yellow-500/20 to-amber-500/20",
  },
  {
    id: "t8",
    name: "Fashion Haul",
    category: "unboxing",
    description: "Show off clothing & fashion items",
    script:
      "Mini fashion haul alert! 🛍️ I ordered 3 kurtas from this brand and each one is more stunning than the last. The fabric quality? *chef's kiss* — pure cotton, perfect for Indian summers. And the best part? Each one was under ₹599! The prints are so unique. I'm going back for more. Link in bio!",
    recommended_voice: "Jaipur Male",
    recommended_avatar: "Rajasthani Male",
    tone: "excited",
    emoji: "🛍️",
    color: "from-fuchsia-500/20 to-pink-500/20",
  },
  {
    id: "t9",
    name: "Comparison Review",
    category: "product-review",
    description: "Compare your product vs competitors",
    script:
      "I tested this ₹299 sunscreen against a ₹1,500 imported one for 2 weeks. Results? ☀️ The affordable one actually performed BETTER — no white cast, no greasy feeling, and SPF 50 protection. Saved money AND got better results. Indian brands are levelling up! Comment which one you use. Details in bio!",
    recommended_voice: "Hyderabad Male",
    recommended_avatar: "Telugu Female",
    tone: "professional",
    emoji: "☀️",
    color: "from-sky-500/20 to-blue-500/20",
  },
  {
    id: "t10",
    name: "Limited Edition Drop",
    category: "sale",
    description: "Build FOMO for exclusive launches",
    script:
      "This is it — the launch you've been waiting for! 🎉 Only 500 units made. Once they're gone, they're GONE forever. I got my hands on one early and the quality is unreal. The packaging alone is worth it. Set your alarms — drops tomorrow at 12 PM. Link in bio to join the waitlist. Don't sleep on this!",
    recommended_voice: "Kolkata Male",
    recommended_avatar: "Bengali Male",
    tone: "excited",
    emoji: "🎉",
    color: "from-emerald-500/20 to-teal-500/20",
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const demoBugs = process.env.NEXT_PUBLIC_DEMO_BUGS === "true";

  const filteredTemplates = TEMPLATES.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.script.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || (demoBugs ? t.category !== selectedCategory : t.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  function useTemplate(template) {
    // Store template in sessionStorage and navigate to generate page
    sessionStorage.setItem(
      "template_prefill",
      JSON.stringify({
        script: template.script,
        tone: template.tone,
        template_name: template.name,
      })
    );
    router.push("/app/generate");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading">
          Templates
        </h1>
        <p className="text-muted-foreground mt-1">
          Start with a proven script template — customize and generate in
          seconds
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="group border-border/50 hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden"
          >
            <CardContent className="p-0">
              {/* Colored Header */}
              <div
                className={`bg-gradient-to-br ${template.color} p-4 relative`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">{template.emoji}</span>
                    <h3 className="text-base font-semibold mt-1">
                      {template.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {CATEGORIES.find((c) => c.id === template.category)?.label}
                  </Badge>
                </div>
              </div>

              {/* Script Preview */}
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.script}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    🎭 {template.recommended_avatar}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    🎙️ {template.recommended_voice}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    💬 {template.tone}
                  </Badge>
                </div>

                {/* Use Button */}
                <Button
                  className="w-full cursor-pointer gradient-bg text-white shadow-md"
                  size="sm"
                  onClick={() => useTemplate(template)}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  {demoBugs ? "Use This Templ..." : "Use This Template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-16">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium">No templates found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or category filter
          </p>
        </div>
      )}
    </div>
  );
}
