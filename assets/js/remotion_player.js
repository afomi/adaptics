import React, { useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const ACCENT = "#7c3aed";
const BG = "#0f0f1a";

function Circle({ delay, x, y, size, color }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    React.createElement("div", {
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        transform: `scale(${scale})`,
        opacity,
      },
    })
  );
}

function Pulse({ cx, cy, radius, frame, fps, delay, color }) {
  const progress = interpolate((frame - delay) % fps, [0, fps], [0, 1], { extrapolateLeft: "clamp" });
  const r = radius * progress;
  const opacity = interpolate(progress, [0, 0.7, 1], [0.8, 0.3, 0]);
  return (
    React.createElement("circle", {
      cx,
      cy,
      r,
      fill: "none",
      stroke: color,
      strokeWidth: 2,
      opacity,
    })
  );
}

function VortexComposition() {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;

  const nodes = [
    { id: "A", label: "Adapt",   angle: -90, dist: 120, color: "#a78bfa" },
    { id: "B", label: "Sense",   angle:  -18, dist: 120, color: "#60a5fa" },
    { id: "C", label: "Decide",  angle:   54, dist: 120, color: "#34d399" },
    { id: "D", label: "Act",     angle:  126, dist: 120, color: "#fbbf24" },
    { id: "E", label: "Learn",   angle:  198, dist: 120, color: "#f87171" },
  ];

  const toRad = (deg) => (deg * Math.PI) / 180;

  const rotate = interpolate(frame, [0, 300], [0, 360]);
  const centerScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });

  return (
    React.createElement(AbsoluteFill, { style: { background: BG } },
      React.createElement("svg", {
        width,
        height,
        style: { position: "absolute", top: 0, left: 0 },
      },
        nodes.map((n, i) =>
          React.createElement(Pulse, {
            key: `pulse-${n.id}`,
            cx: cx + Math.cos(toRad(n.angle + rotate)) * n.dist,
            cy: cy + Math.sin(toRad(n.angle + rotate)) * n.dist,
            radius: 40,
            frame,
            fps,
            delay: i * 10,
            color: n.color,
          })
        ),
        nodes.map((n, i) => {
          const nx = cx + Math.cos(toRad(n.angle + rotate)) * n.dist;
          const ny = cy + Math.sin(toRad(n.angle + rotate)) * n.dist;
          const next = nodes[(i + 1) % nodes.length];
          const nx2 = cx + Math.cos(toRad(next.angle + rotate)) * next.dist;
          const ny2 = cy + Math.sin(toRad(next.angle + rotate)) * next.dist;
          const linkOpacity = interpolate(frame, [i * 8, i * 8 + 20], [0, 0.4], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return React.createElement("line", {
            key: `link-${n.id}`,
            x1: nx, y1: ny,
            x2: nx2, y2: ny2,
            stroke: n.color,
            strokeWidth: 1.5,
            opacity: linkOpacity,
          });
        })
      ),
      React.createElement("div", {
        style: {
          position: "absolute",
          left: cx - 52,
          top: cy - 52,
          width: 104,
          height: 104,
          borderRadius: "50%",
          background: ACCENT,
          transform: `scale(${centerScale})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 40px ${ACCENT}88`,
        },
      },
        React.createElement("span", {
          style: { color: "#fff", fontWeight: 700, fontSize: 18, fontFamily: "sans-serif" },
        }, "adaptics")
      ),
      nodes.map((n, i) => {
        const nx = cx + Math.cos(toRad(n.angle + rotate)) * n.dist;
        const ny = cy + Math.sin(toRad(n.angle + rotate)) * n.dist;
        const appear = interpolate(frame, [i * 8, i * 8 + 20], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return React.createElement("div", {
          key: `node-${n.id}`,
          style: {
            position: "absolute",
            left: nx - 28,
            top: ny - 28,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: n.color + "22",
            border: `2px solid ${n.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: appear,
            transform: `scale(${appear})`,
          },
        },
          React.createElement("span", {
            style: { color: n.color, fontWeight: 600, fontSize: 11, fontFamily: "sans-serif" },
          }, n.label)
        );
      }),
      React.createElement("div", {
        style: {
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#ffffff44",
          fontFamily: "sans-serif",
          fontSize: 12,
        },
      }, "sense → decide → act → learn → adapt")
    )
  );
}

function PlayerWithAutoPlay() {
  const playerRef = useRef(null);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const id = setTimeout(() => {
      player.pause();
      player.seekTo(0);
      requestAnimationFrame(() => player.play());
    }, 100);
    return () => clearTimeout(id);
  }, []);

  return React.createElement(Player, {
    ref: playerRef,
    component: VortexComposition,
    durationInFrames: 300,
    fps: 30,
    compositionWidth: 640,
    compositionHeight: 360,
    style: { width: "100%", borderRadius: "8px" },
    controls: true,
    loop: true,
  });
}

export function mountRemotionPlayer(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const root = createRoot(el);
  root.render(React.createElement(PlayerWithAutoPlay));
}
