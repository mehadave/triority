import { Link } from 'react-router';
import { GrowthStage, HandCircle, MiniSunflower, Tick } from '../components/art';
import { SunflowerPhoto } from '../components/SunflowerPhoto';
import { PROMISE_LINE } from '../content/affirmations';

const STEPS = [
  {
    title: 'Pick three',
    body: 'Each morning, choose the three things that would make today feel productive. Just three.',
  },
  {
    title: 'Tick them off',
    body: 'Circle by circle, your sunflower grows from a seed to a full bloom.',
  },
  {
    title: 'Win the day',
    body: 'Finish all three and the day is won. Keep going and watch your streak grow.',
  },
] as const;

const PROMISES = [
  {
    title: 'Saviors for slow days',
    body: 'Miss a day? A monthly savior can keep your streak alive. Life happens.',
  },
  {
    title: 'Yours alone',
    body: 'No accounts, no ads, no trackers. Everything stays on your device.',
  },
  {
    title: 'Works offline',
    body: 'Install it to your home screen. It opens instantly, signal or not.',
  },
] as const;

/** A standalone page that introduces Triority, reached from the logo in the top bar. */
export function AboutScreen() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <header className="flex min-h-11 items-center justify-between">
        <span className="font-display text-[28px] leading-none">Triority</span>
        <Link to="/" className="text-[15px] font-medium underline underline-offset-4">
          Open the app
        </Link>
      </header>

      <section className="mt-10 flex flex-col items-center text-center">
        <div className="h-40 w-40">
          <SunflowerPhoto sizes="160px" eager className="h-full w-full object-contain" />
        </div>
        <h1 className="title mt-4">Three things. Every day.</h1>
        <p className="text-muted-ink mt-3 max-w-sm text-[17px]">
          A tiny daily ritual for keeping the promises you make to yourself.
        </p>
        <Link to="/" className="btn-sun mt-6 px-7">
          Start today
        </Link>
      </section>

      <section aria-labelledby="how" className="mt-16">
        <h2 id="how" className="text-muted-ink text-[14px] font-medium tracking-wide uppercase">
          How it works
        </h2>
        <ol className="mt-4 flex flex-col gap-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4">
              <span className="relative h-[46px] w-[46px] shrink-0" aria-hidden="true">
                <HandCircle variant={i} />
                {i === 2 ? (
                  <Tick animate={false} />
                ) : (
                  <span className="font-display absolute inset-0 flex items-center justify-center text-[22px]">
                    {i + 1}
                  </span>
                )}
              </span>
              <div>
                <h3 className="text-[18px] font-medium">{step.title}</h3>
                <p className="text-muted-ink mt-0.5 text-[16px]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Your sunflower grows" className="mt-12">
        <div
          className="border-ink grid grid-cols-4 items-end gap-2 rounded-3xl border-2 px-3 pt-2 pb-3"
          aria-hidden="true"
        >
          {([0, 1, 2] as const).map((stage) => (
            <div key={stage} className="aspect-square">
              <GrowthStage stage={stage} />
            </div>
          ))}
          <div className="relative aspect-square">
            <GrowthStage stage={3} />
            <div className="absolute top-[5%] left-[26.67%] h-[46.67%] w-[46.67%]">
              <MiniSunflower filled />
            </div>
          </div>
        </div>
        <p className="text-muted-ink mt-2 text-center text-[14px]">One step per finished task.</p>
      </section>

      <section aria-labelledby="why" className="mt-16">
        <h2 id="why" className="text-muted-ink text-[14px] font-medium tracking-wide uppercase">
          Made to be gentle
        </h2>
        <ul className="mt-2">
          {PROMISES.map((p) => (
            <li key={p.title} className="border-hairline border-b py-4 last:border-b-0">
              <h3 className="text-[18px] font-medium">{p.title}</h3>
              <p className="text-muted-ink mt-0.5 text-[16px]">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 flex flex-col items-center text-center">
        <p className="promise text-center">{PROMISE_LINE}</p>
        <Link to="/" className="btn-sun mt-6 px-7">
          Pick today’s three
        </Link>
      </section>
    </main>
  );
}

export default AboutScreen;
