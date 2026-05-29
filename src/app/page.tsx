import Link from "next/link"
import { Nav } from "@/components/layout/Nav"
import { Frame } from "@/components/ui/Frame"
import "./page.module.css"

const MARQUEE_ITEMS = [
  "Character universes",
  "Storyboards",
  "Finished videos",
  "Moodboards",
  "Concept art",
  "Lookdev",
  "Character universes",
  "Storyboards",
  "Finished videos",
  "Moodboards",
  "Concept art",
  "Lookdev",
]

const SPECIALISTS = [
  { title: "Video Specialist", desc: "Boards scenes, generates shots, renders into a finished cut.", tag: "@video" },
  { title: "Concept Artist", desc: "Designs characters and environments on-model across the universe.", tag: "@concept" },
  { title: "Look Director", desc: "Grades the palette, light, and mood so every frame feels from one film.", tag: "@look" },
  { title: "Story Editor", desc: "Writes the bible, beats, and scene breakdowns.", tag: "@story" },
]

const STEPS = [
  { n: "STEP 01", h: "Drop your idea", p: "A logline, a moodboard, a single image. Anything is a valid start." },
  { n: "STEP 02", h: "Build the universe", p: "Cast characters, set the look, sprawl your references." },
  { n: "STEP 03", h: "Ship the cut", p: "One click turns your board into an edited video sequence." },
]

export default function LandingPage() {
  return (
    <>
      <Nav activeHref="/" />

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="chip reveal">
              <span className="dot" /> The creative canvas for video
            </span>
            <h1 className="reveal" style={{ marginTop: 20 }}>
              Idea to finished&nbsp;video, <span className="em">before the coffee&apos;s cold.</span>
            </h1>
            <p className="lead reveal">
              Inkycut is the infinite canvas where creators turn a one-line concept into characters, scenes, and a
              finished, edited video with a crew of AI specialists doing the busywork.
            </p>
            <div className="hero-cta reveal">
              <Link className="btn btn-accent" href="/login">
                Start a board
              </Link>
              <Link className="btn btn-ghost" href="/ideas">
                See what people make →
              </Link>
            </div>
            <p className="hero-note reveal">No card. Export in 4K, ProRes &amp; MP4.</p>
          </div>

          <div className="board reveal" aria-hidden="true">
            <div className="toprail">
              <span className="tdot a" />
              <span className="tdot" />
              <span className="tdot" />
              <span style={{ marginLeft: 6 }}>&quot;Rooftop chase - neon city&quot; · Page 1</span>
            </div>
            <div className="card-float nf1">
              <Frame hue="rain" slug="CHAR_01" meta="3:4 · v2" rec />
            </div>
            <div className="card-float nf2">
              <Frame hue="amber" slug="HERO_LOOK" meta="4:5" />
            </div>
            <div className="card-float nf3">
              <Frame hue="slate" slug="EST_SHOT" meta="16:9" />
            </div>
            <div className="chatcard">
              <div className="who">
                <span className="badge">VIDEO</span> Video Specialist
              </div>
              <p>Generated 4 shots for the rooftop chase. Want me to cut these into a finished sequence?</p>
              <span className="pill">rendering the cut...</span>
            </div>
          </div>
        </div>
      </section>

      <div className="marq" aria-hidden="true">
        <div className="marq-track">
          {MARQUEE_ITEMS.map((item, index) => (
            <span key={`${item}-${index}`} className="marq-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="wrap feat">
          <div className="feat-text reveal">
            <span className="eyebrow">Infinite canvas</span>
            <h2>Your whole production, on one surface.</h2>
            <p>
              Pan, zoom, and sprawl. References, character sheets, boards, and notes live side by side with no folders
              and no tab juggling.
            </p>
            <div className="feat-list">
              <div className="li">
                <span className="mk">+</span>
                <span>
                  <b>Drop anything</b> images, prompts, docs, links. It all becomes a card.
                </span>
              </div>
              <div className="li">
                <span className="mk">+</span>
                <span>
                  <b>Spatial thinking</b> cluster a scene, group a character, draw the throughline.
                </span>
              </div>
              <div className="li">
                <span className="mk">+</span>
                <span>
                  <b>Live with your team</b> cursors and comments shared in real time.
                </span>
              </div>
            </div>
          </div>
          <div className="visual reveal">
            <div className="board" style={{ aspectRatio: "1/0.78", boxShadow: "var(--shadow-2)" }}>
              <div className="toprail">
                <span className="tdot a" />
                <span className="tdot" />
                <span className="tdot" />
                <span style={{ marginLeft: 6 }}>Untitled board</span>
              </div>
              <Frame
                hue="slate"
                slug="REF_A"
                rec
                className="card-float"
                style={{ width: "34%", top: 60, left: 24, aspectRatio: "3/4" }}
              />
              <Frame
                hue="crimson"
                slug="INT_NIGHT"
                meta="4:5"
                className="card-float"
                style={{ width: "30%", top: 54, right: 26, aspectRatio: "4/5", transform: "rotate(3deg)" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--paper-2)", borderBlock: "1px solid var(--line-2)" }}>
        <div className="wrap">
          <div className="spec-head reveal">
            <span className="eyebrow">A crew on tap</span>
            <h2>Direct a team of AI specialists.</h2>
            <p>You set the vision. They handle the grind.</p>
          </div>
          <div className="spec-grid">
            {SPECIALISTS.map((specialist) => (
              <div key={specialist.tag} className="spec reveal">
                <div className="ic" />
                <h3>{specialist.title}</h3>
                <p>{specialist.desc}</p>
                <div className="tg">{specialist.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="spec-head reveal" style={{ marginBottom: 52 }}>
            <span className="eyebrow">Three moves</span>
            <h2>Concept to a finished cut in minutes.</h2>
          </div>
          <div className="steps">
            {STEPS.map((step) => (
              <div key={step.n} className="step reveal">
                <div className="n">{step.n}</div>
                <h3>{step.h}</h3>
                <p>{step.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-band reveal">
            <h2>Make something this&nbsp;weekend.</h2>
            <p>Open a blank canvas and see how far a single idea travels.</p>
            <div className="hero-cta">
              <Link className="btn btn-accent" href="/login">
                Open Inkycut →
              </Link>
              <Link
                className="btn btn-ghost"
                href="/ideas"
                style={{ background: "rgba(255,255,255,.08)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}
              >
                Browse the gallery
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot-grid">
          <div>
            <Link className="logo" href="/">
              <span className="logo-mark" aria-hidden="true" />
              Inkycut
            </Link>
            <p style={{ marginTop: 14, fontSize: 13.5, maxWidth: "22em" }}>The infinite canvas for video.</p>
          </div>
        </div>
        <div
          className="wrap"
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--ink-faint)",
          }}
        >
          <span>© 2026 Inkycut</span>
          <span>Made on an infinite canvas</span>
        </div>
      </footer>
    </>
  )
}
