/* v2 choreography: OSD section tracking, thermal-scale scroll tick,
   pinned Sankey audit scene, TEP ruler scrub, reveals. Deliberate pacing. */
(() => {
  const doc = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  if (typeof gsap === "undefined") { doc.classList.add("motion-off"); return; }

  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase, ScrollToPlugin);

  /* smooth in-page anchors (CSS smooth scrolling conflicts with ScrollTrigger) */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      gsap.to(window, {
        scrollTo: { y: target, offsetY: 60 },
        duration: reduce ? 0 : 1.1,
        ease: "power3.inOut",
      });
    });
  });
  CustomEase.create("settle", "0.19, 1, 0.22, 1");
  gsap.defaults({ ease: "settle", duration: 1.1 });

  if (reduce) { doc.classList.add("motion-off"); return; }

  const fontsReady = Promise.race([
    document.fonts.ready,
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  fontsReady.then(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 800px)",
        mobile: "(max-width: 799px)",
        motionOK: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        if (!ctx.conditions.motionOK) return () => {};
        heroIntro();
        pageHeadIntro();
        sceneHeads();
        revealBatches();
        scaleTick();
        sparkScene();
        rulerScrub();
        ekbScale();
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
        return () => {};
      }
    );
  });

  function heroIntro() {
    const h1 = document.getElementById("hero-h1");
    if (!h1) return;
    const split = SplitText.create(h1, { type: "lines", mask: "lines" });
    gsap.timeline()
      .from(split.lines, { yPercent: 114, duration: 1.5, stagger: 0.15 }, 0.3)
      .fromTo("#hero-eyebrow", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0 }, 0.2)
      .fromTo(".hero-sub", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.3 }, 1.0)
      .fromTo(".hero-jump a", { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.13 }, 1.15)
      .fromTo(".scale-bar", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.8 }, 1.3);
  }

  function pageHeadIntro() {
    const h1 = document.querySelector(".page-head h1");
    if (!h1) return;
    const split = SplitText.create(h1, { type: "lines", mask: "lines" });
    gsap.timeline()
      .from(split.lines, { yPercent: 114, duration: 1.3, stagger: 0.12 }, 0.2)
      .fromTo(".page-head .eyebrow", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0 }, 0.1)
      .fromTo(".page-head .lede", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0 }, 0.7)
      .fromTo(".scale-bar", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.8 }, 0.9);
  }

  function sceneHeads() {
    document.querySelectorAll(".scene-head").forEach((head) => {
      const h2 = head.querySelector("h2");
      if (!h2) return;
      const split = SplitText.create(h2, { type: "lines", mask: "lines" });
      gsap.timeline({ scrollTrigger: { trigger: head, start: "top 78%", once: true } })
        .fromTo(head.querySelector(".eyebrow"),
          { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0, duration: 0.9 }, 0)
        .from(split.lines, { yPercent: 114, duration: 1.25, stagger: 0.1 }, 0.12);
    });
  }

  function revealBatches() {
    const items = document.querySelectorAll(".scene .reveal");
    if (!items.length) return;
    ScrollTrigger.batch(items, {
      start: "top 86%",
      once: true,
      onEnter: (els) =>
        gsap.fromTo(els, { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12, overwrite: true }),
    });
  }

  /* scroll position on the ironbow thermal scale */
  function scaleTick() {
    const tick = document.querySelector(".scale-tick");
    if (!tick) return;
    gsap.to(tick, {
      top: "100%",
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.4 },
    });
  }

  /* etüt sparklines draw in on entry */
  function sparkScene() {
    document.querySelectorAll(".spark").forEach((p) => {
      gsap.from(p, {
        drawSVG: 0,
        duration: 1.7,
        ease: "power2.out",
        scrollTrigger: { trigger: p.closest(".spark-card"), start: "top 84%", once: true },
      });
    });
  }

  function rulerScrub() {
    const svg = document.getElementById("tep-ruler");
    if (!svg) return;
    gsap.from(svg.querySelector(".fill-line"), {
      drawSVG: 0,
      ease: "none",
      scrollTrigger: {
        trigger: svg,
        start: "top 78%",
        end: "top 25%",
        scrub: 0.6,
      },
    });
    svg.querySelectorAll(".mark").forEach((g, i) => {
      gsap.from(g, {
        autoAlpha: 0,
        x: -14,
        duration: 0.9,
        scrollTrigger: { trigger: svg, start: `top ${72 - i * 16}%`, once: true },
      });
    });
  }

  function ekbScale() {
    const steps = document.querySelectorAll(".ekb-step");
    if (!steps.length) return;
    gsap.from(steps, {
      clipPath: "inset(100% 0 0 0)",
      duration: 1.2,
      stagger: 0.09,
      scrollTrigger: { trigger: ".ekb-scale", start: "top 80%", once: true },
    });
  }
})();
