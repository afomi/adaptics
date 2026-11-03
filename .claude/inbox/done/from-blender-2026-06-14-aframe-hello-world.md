---
from: blender (isometric-rooms project)
to: adaptics
created: 2026-06-14
status: pending
summary: Build an A-Frame hello world page and load the low-poly characters from Blender as 3D artifacts
---

## Context

Ryan is exploring WebXR / shared 3D web worlds with his 8-year-old daughter. They built three low-poly Blender characters together:
- A friendly green lizard with an orange frill and forked tongue
- Two tuxedo kittens with bow ties (one red, one blue) and expressive eyes

The characters were built in Blender 5.0.1 as low-poly geometry, flat-shaded, warm papercraft palette. The goal is to get them into a browser-based A-Frame scene — ideally something she can open in a browser and walk around in.

A-Frame was chosen because:
- No install required, runs in any browser
- Declarative HTML — beginner-friendly, she can edit tags to move things
- Has Networked A-Frame for multiplayer (future step)
- Easy GLB import

## Request

### 1. Create an A-Frame hello world page

Create a self-contained HTML page at a sensible path in the adaptics project (e.g. `priv/static/aframe/index.html` or a dedicated LiveView route `/aframe`).

The page should:
- Load A-Frame from CDN (`https://aframe.io/releases/1.6.0/aframe.min.js`)
- Show a simple scene: a ground plane, a sky, basic lighting
- Include WASD + mouse-look controls (A-Frame default)
- Have a short title/label in the scene ("Hello World")
- Be viewable at a local URL without any build step

### 2. Export the Blender characters to GLB and load them into the scene

The Blender source files are at:
- **Blend file:** `/Users/ryan/workspace/isometric-rooms/scenes/characters.blend`
- **Render preview:** `/Users/ryan/workspace/isometric-rooms/renders/characters.png`
- **Build script:** `/Users/ryan/workspace/isometric-rooms/scripts/characters.py`

Export the characters to GLB using Blender's headless export:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  /Users/ryan/workspace/isometric-rooms/scenes/characters.blend \
  --python-expr "
import bpy
bpy.ops.export_scene.gltf(
  filepath='/Users/ryan/workspace/adaptics/priv/static/aframe/characters.glb',
  export_format='GLB',
  export_apply=True
)
"
```

Place the exported `characters.glb` in `priv/static/aframe/` so it's served statically.

Load it into the A-Frame scene with:
```html
<a-assets>
  <a-asset-item id="characters" src="/aframe/characters.glb"></a-asset-item>
</a-assets>
<a-entity gltf-model="#characters" position="0 0 -3" scale="2 2 2"></a-entity>
```

### 3. Make it delightful

- Warm background sky color matching the render palette (`#f5ede0` or similar)
- Soft directional light from upper-left (warm) + ambient fill (cool)
- The characters positioned so you're looking at them when the page loads
- A subtle ground shadow if feasible

## Relevant files

- `/Users/ryan/workspace/isometric-rooms/scripts/characters.py` — full Blender build script, palette, geometry
- `/Users/ryan/workspace/isometric-rooms/renders/characters.png` — what they look like rendered
- `/Users/ryan/workspace/adaptics/CLAUDE.md` — adaptics project setup (Phoenix 1.8, LiveView)

## Acceptance

- [ ] `priv/static/aframe/index.html` exists and loads in browser without errors
- [ ] A-Frame scene renders: ground, sky, lighting, "Hello World" label
- [ ] `characters.glb` exported and placed in `priv/static/aframe/`
- [ ] Characters appear in the scene, visible on page load
- [ ] WASD navigation works — you can walk up to the characters
- [ ] Page is accessible at a local URL (static file or Phoenix route)
