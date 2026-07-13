# Stack & Launch — Rocket Assembly Blueprint

A browser game where you build a rocket by stacking real part categories —
engines, nozzles, fuel tanks, and a capsule — onto a live blueprint, then
launch it and see whether it reaches orbit.

No build step, no dependencies. It's three static files.

## Play it

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### On GitHub Pages
1. Push this folder to a repo.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Your game is live at `https://<username>.github.io/<repo>/`.

## How it works

- **Pick parts** from the catalog on the left (capsules, engines, nozzles, fuel tanks).
- **Stack** them — order matters. An engine starts a new stage; the next
  nozzle and tank(s) attach to it, until you add another engine or a capsule.
- **Read the telemetry** panel: height, wet mass, liftoff thrust,
  thrust-to-weight ratio (TWR), estimated Δv, stage count, and build cost.
- **Watch for warnings** — mismatched propellants, missing nozzles, or fuel
  tanks with no engine underneath all hurt performance.
- **Launch** — the vehicle either fails to clear the tower (TWR < 1), falls
  back down (not enough Δv), or reaches a stable low Earth orbit
  (effective Δv ≥ ~9,400 m/s).

## The physics model

This is a simplified, single-axis Tsiolkovsky rocket equation, computed
stage-by-stage from the bottom up:

```
Δv_stage = Isp_effective × g0 × ln( (mass_above + wet_mass) / (mass_above + dry_mass) )
```

`mass_above` is the wet mass of every stage and payload stacked on top of
the current one. Stage Isp and thrust are adjusted for nozzle type
(bell / conical / aerospike) and for propellant mismatches. A fixed
1,500 m/s is subtracted from total Δv to approximate gravity and drag
losses during ascent.

This is a gameplay approximation, not flight software — it ignores
staging timing, atmospheric drag curves, and trajectory shaping.

## Files

```
index.html   structure
style.css    blueprint-drafting visual theme
game.js      part data, stacking logic, physics, rendering, launch animation
```

## Credits

Part stats are loosely inspired by publicly available reference figures for
Soyuz, the N1, the Space Shuttle, Orion, and the SpaceX Raptor engine —
rebalanced for gameplay rather than accuracy.
