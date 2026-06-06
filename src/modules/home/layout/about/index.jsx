import LanguagesAnimation from "../../components/LanguagesAnimation";
import AspectRatioAnimation from "../../components/AspectRatioAnimation";

const cards = [
  {
    point: "1",
    tag: "Variety of Avatars",
    title: "20+ AI Avatars",
    images: ["avatar.mp4"],
    description:
      "Diverse Indian faces North, South, East, West. Ethical stock library or upload your own.",
    outcome: "Find the perfect face for every property and audience.",
  },
  {
    point: "2",
    tag: "Indian Accent Voices",
    title: "Choose from variety of languages",
    images: [],
    description:
      "natural Indian-English voices Mumbai, Delhi, Bangalore, Hyderabad & more.",
      outcome: "Speak to buyers in their preferred language and accent.",
  },
  {
    point: "3",
    tag: "Video Format",
    title: "9:16 Reel Format",
    images: [],
    description:
      "Vertical videos optimized for Instagram Reels, YouTube Shorts etc. 15-30 seconds",
      outcome: "Ready-to-post videos built for maximum social reach.",
  },
  {
    point: "4",
    tag: "Voiceover",
    title: "Lip-Sync Technology",
    images: [],
    description:
      "State-of-the-art AI lip-sync. Your avatars speak naturally with perfect mouth movements.",
      outcome: "Human-like presenters without filming or retakes.",
  },
];

export default function About() {
  function FeatureAnimation({ type }) {
    switch (type) {
      case "Indian Accent Voices":
        return <LanguagesAnimation />;

      case "Video Format":
        return <AspectRatioAnimation />;

      default:
        return null;
    }
  }
  return (
    <main className="max-w-6xl mx-auto bg-[#f5f6f0]">
      <div className="flex justify-between items-center">
        <div className="flex flex-col items-start justify-center w-xl gap-4">
          <span className="uppercase bg-[#c7f038] px-4 font-bold py-1 rounded-full text-sm">
            What We Build Live
          </span>
          <h1 className="text-4xl font-bold">
            The exact creative workflows we demo for your real estate ad.
          </h1>
          <p className="text-neutral-500">
            See how ThumbGram listings, and assets into image and video ads
            ready to launch.
          </p>
        </div>

        <div className="bg-neutral-900 shadow-xl rounded-3xl flex flex-col gap-4 p-8">
          <span className="uppercase text-neutral-300 text-sm">
            How It Works
          </span>
          <ul className="flex flex-col items-start justify-center gap-2">
            <li className="flex items-center justify-center gap-2">
              <span className="bg-[#c7f038] h-6 font-bold text-sm flex items-center justify-center w-6 rounded-full">
                1
              </span>
              <span className="text-neutral-300">
                Choose Avatar & Upload Assets
              </span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <span className="bg-[#c7f038] h-6 font-bold text-sm flex items-center justify-center w-6 rounded-full">
                2
              </span>
              <span className="text-neutral-300">Write Your Script</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <span className="bg-[#c7f038] h-6 font-bold text-sm flex items-center justify-center w-6 rounded-full">
                3
              </span>
              <span className="text-neutral-300">Generate & Download</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-6xl py-12">
        {cards.map((item, index) => (
          <div
            className="flex pl-12 gap-8 bg-white showdow-xl rounded-3xl"
            key={index}
          >
            <div className="gap-4 flex flex-col items-start justify-center">
              <div className="flex flex-row-reverse w-full items-center justify-between">
                <div className="h-6 w-6 flex items-center justify-center text-xs text-neutral-500 font-semibold rounded-full">
                  <span>0{item.point}</span>
                </div>
                <span className="text-black bg-[#c6f12f] px-4 py-1 rounded-full text-xs font-bold uppercase">
                  {item.tag}
                </span>
              </div>
              <h1 className="text-2xl font-bold w-xs">{item.title}</h1>
              <p className="w-xs text-sm text-neutral-500">{item.description}</p>
              <div className="border-t w-xs pt-2 border-t-neutral-500">
                <span className="uppercase text-xs text-neutral-500">Outcome</span>
                <p className="text-sm font-semibold">{item.outcome}</p>
              </div>
            </div>

            <div className="">
              {item.images.length > 0 ? (
                <video
                  src={item.images[0]}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full aspect-[9/16] rounded-r-2xl object-cover"
                />
              ) : (
                <FeatureAnimation type={item.tag} />
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
