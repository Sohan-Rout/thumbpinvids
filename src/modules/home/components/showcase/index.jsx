import Image from "next/image";

export default function Showcase() {
    return (
        <main className="flex items-center justify-center bg-gray-100">
            <div className="relative inline-block">
                <Image 
                    className="object-cover rounded-lg" 
                    width={1250} 
                    height={1250} 
                    alt="bg" 
                    src="/bg/bg.avif" 
                />

                <div className="absolute inset-0 flex justify-center items-center">
                    <div className="bg-white p-4 shadow-xl border border-neutral-300 rounded-xl">
                        <span className="text-black font-bold">Your text here</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
