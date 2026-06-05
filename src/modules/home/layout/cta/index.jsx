import Link from "next/link";
import TextCarousel from "../../components/text-carousal";

export default function Cta() {
  return (
    <main className="max-w-6xl mx-auto bg-neutral-900 py-12 rounded-3xl">
      <div className="flex flex-col items-center gap-4 justify-center">
        <div className="bg-[#c7f038] px-6 py-1 rounded-full">
          <span className="uppercase font-bold text-sm text-black">
            Free Demo
          </span>
        </div>
        <h1 className="text-white w-2xl leading-relaxed text-6xl text-center font-semibold">
          Your Next{" "}
          <span className="p-2 text-black bg-[#c7f038] font-bold italic rounded">
            Winning
          </span>{" "}
          Ad is 15 Minutes Away.
        </h1>

        <div className="py-8 flex items-center justify-center flex-col gap-4">
          <Link
            href="/auth/signup"
            className="bg-[#c7f038] px-6 py-4 rounded-xl text-lg font-semibold"
          >
            Get Started Here
          </Link>
          <span className="text-neutral-500 text-sm">
            No commitment, We confirm within 24 hrs
          </span>
        </div>

        <div className="overflow-hidden max-w-6xl">
          <TextCarousel
            texts={[
              "AI Video Generation",
              "Real Estate Ads",
              "Real Estate Creatives",
              "UGC Creatives",
              "Performance Creatives",
              "Creator Style Videos",
              "Social Media Ads",
              "Video Ads At Scale",
            ]}
            direction="left"
          />
        </div>
        <div className="overflow-hidden max-w-6xl">
          <TextCarousel
            texts={[
              "Static Image Ads",
              "Winner-Based Recommendations",
              "Ai Script Generation",
              "Ai Voiceover",
              "Performance Creatives",
              "Creator Style Videos",
              "Social Media Ads",
              "Video Ads At Scale",
            ]}
            direction="right"
          />
        </div>
      </div>
    </main>
  );
}
