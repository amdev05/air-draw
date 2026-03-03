import Link from "next/link";

const PROGRAMS = [{ title: "Air Draw", slug: "air-draw" }];

export default function Home() {
  return (
    <main className="w-dvw h-dvh flex justify-center items-center">
      <section className="mx-auto w-fit">
        <ul className="w-sm">
          {PROGRAMS.map((program, index) => (
            <li className="w-full" key={index}>
              <Link href={program.slug} className="flex justify-center items-center w-full py-4 bg-[#f5f5f7] text-black rounded-xl">
                <span className="text-center font-semibold">{program.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
