// /transcripts session page: keep the sidebar table of contents in step with
// the turn being read, and move between turns with h / l.
const NAV_OFFSET = 80; // fixed site nav + a little air

export const TranscriptToc = {
  mounted() {
    this.onScroll = () => {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        this.highlight();
      });
    };
    this.onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "h") this.jump(-1);
      if (e.key === "l") this.jump(1);
    };
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("keydown", this.onKey);
    this.highlight();
  },

  updated() {
    this.highlight();
  },

  destroyed() {
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("keydown", this.onKey);
    if (this.frame) cancelAnimationFrame(this.frame);
  },

  sections() {
    return [...this.el.querySelectorAll("section[data-turn]")];
  },

  // The current turn: the last one whose top has scrolled past the nav.
  currentIndex() {
    const sections = this.sections();
    let index = 0;
    sections.forEach((s, i) => {
      if (s.getBoundingClientRect().top <= NAV_OFFSET) index = i;
    });
    return index;
  },

  highlight() {
    const section = this.sections()[this.currentIndex()];
    if (!section) return;
    const turn = section.dataset.turn;
    document.querySelectorAll("#transcript-toc a[data-turn]").forEach((a) => {
      if (a.dataset.turn === turn) {
        a.setAttribute("aria-current", "true");
        a.scrollIntoView({ block: "nearest" });
      } else {
        a.removeAttribute("aria-current");
      }
    });
  },

  jump(delta) {
    const sections = this.sections();
    const target = sections[this.currentIndex() + delta];
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    history.replaceState(null, "", `#${target.id}`);
  },
};
