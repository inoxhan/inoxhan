import { Reveal } from "@/components/home/Reveal";

const STEPS = [
  {
    no: "01",
    title: "Ürününü Bul",
    desc: "Katalogdan ürünü seç veya ihtiyacını yaz. Adını bilmiyorsan fotoğrafını yükle.",
  },
  {
    no: "02",
    title: "Teklif İste",
    desc: "İletişim bilgilerini bırak — 60 saniyeden kısa sürer.",
  },
  {
    no: "03",
    title: "Teklifini Al",
    desc: "Ekibimiz en geç 1 saat içerisinde sana özel teklifle dönüş yapar.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
      <Reveal>
        <h2 className="font-display text-center text-3xl font-bold tracking-tight text-steel-900 md:text-4xl">
          Nasıl Çalışıyor?
        </h2>
        <p className="mt-3 text-center text-lg text-steel-500">
          Üç adım. Toplam bir dakika.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.no} delay={i * 0.12}>
            <div className="group relative h-full overflow-hidden rounded-lg border border-steel-200 bg-white p-8 shadow-card transition-shadow hover:shadow-elevated">
              <span className="font-display absolute -top-3 -right-2 text-[7rem] leading-none font-bold text-steel-100 transition-colors group-hover:text-steel-200">
                {s.no}
              </span>
              <div className="relative">
                <p className="font-mono text-sm text-steel-400">{s.no}</p>
                <h3 className="font-display mt-2 text-2xl font-semibold text-steel-900">
                  {s.title}
                </h3>
                <p className="mt-3 leading-relaxed text-steel-600">{s.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
