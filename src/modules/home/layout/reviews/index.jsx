import { Star } from "lucide-react";

function Stars({ fill, stroke }) {
  return (
    <div className="flex gap-2">
      {[...Array(5)].map((_, index) => (
        <Star key={index} fill={fill} size={14} stroke={stroke} />
      ))}
    </div>
  );
}

export default function Review() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 bg-white">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 justify-between items-start lg:items-end">
        <div className="flex flex-col items-start justify-center w-full max-w-xl gap-4">
          <span className="uppercase bg-[#c7f038] px-4 font-bold py-1 rounded-full text-xs sm:text-sm">
            Client Reviews
          </span>

          <h1 className="text-3xl sm:text-4xl font-bold">
            Proof from teams scaling creative faster with ThumbGram.
          </h1>

          <p className="text-neutral-500 text-sm sm:text-base">
            Real growth teams use ThumbGram to ship more creative, test more
            angles, and put budget toward what converts.
          </p>
        </div>
        <div className="bg-neutral-900 shadow-xl rounded-3xl flex flex-col gap-2 p-6 sm:p-8 w-full lg:w-auto">
          <span className="uppercase text-neutral-300 text-sm">
            Average Rating
          </span>

          <div className="flex justify-between items-center">
            <h1 className="text-4xl text-white font-black">4.9</h1>
            <Stars fill="#c7f038" stroke="#c7f038" />
          </div>

          <ul className="flex flex-col gap-3 border-t pt-4 border-t-neutral-600">
            <li className="flex items-center gap-2">
              <span className="bg-[#c7f038] h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>

              <span className="text-neutral-300 text-sm w-64">
                More creative output without adding to the production budget
              </span>
            </li>

            <li className="flex items-center gap-2">
              <span className="bg-[#c7f038] h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>

              <span className="text-neutral-300 text-sm w-64">
                Go from idea to live ad in minutes
              </span>
            </li>

            <li className="flex items-center gap-2">
              <span className="bg-[#c7f038] h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span>

              <span className="text-neutral-300 text-sm w-64">
                Image, video, and UGC in one platform
              </span>
            </li>
          </ul>

          <div className="py-2 flex w-full">
            <span className="text-neutral-500 text-sm w-68">
              Based on 2,400+ verified reviews across real estate firms and
              performance marketing teams.
            </span>
          </div>
        </div>
      </div>

      <div className="flex pt-12 gap-4">
        <div className="w-xl flex flex-col gap-8 p-6 bg-[#f5f6f0] border border-neutral-300 rounded-3xl">
          <div className="flex items-center justify-between">
            <span className="bg-white px-4 py-1 rounded-full border uppercase font-bold border-neutral-300 text-xs">Featured Story</span>
            <Stars fill="black" stroke="black" />
          </div>
          <p className="text-2xl">
            “ThumbGram cut our creative turnaround from days to minutes. We can launch more angles, react faster to what is working, and scale performance without growing the team behind the ads.”
          </p>
          <div className="flex justify-between items-center gap-2">
            <div className="border border-neutral-300 rounded-3xl w-42 p-4">
              <h1 className="font-black text-xl">$1M</h1>
              <span className="text-xs text-neutral-500">ARR in 4 months</span>
            </div>
            <div className="border border-neutral-300 rounded-3xl w-42 p-4">
              <h1 className="font-black text-xl">160%</h1>
              <span className="text-xs text-neutral-500">increase in sales</span>
            </div>
            <div className="border border-neutral-300 rounded-3xl w-42 p-4">
              <h1 className="font-black text-xl">3x</h1>
              <span className="text-xs text-neutral-500">higher ROI</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
            <div className="bg-white border border-neutral-300 w-lg p-6 rounded-3xl">
                <div className="flex items-center justify-between">
                    <span className="bg-[#c9f036] px-4 py-1 rounded-full uppercase font-bold text-xs">Brandboost</span>
                    <Stars fill="black" stroke="black" />
                </div>
            </div>
            <div>

            </div>
        </div>
      </div>
    </main>
  );
}
