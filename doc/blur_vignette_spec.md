# Blur Vignette Component Specification

## Reference
Inspired by:
- `ui-layouts` ([ui-layouts.com](https://www.ui-layouts.com/components/blur-vignette))
- Artur Bień / expensive.toys ([expensive.toys/blog/blur-vignette](https://expensive.toys/blog/blur-vignette))
- Apple Vision Pro UI blur vignette aesthetic

## Architecture & Mathematical Mask Composition
The Blur Vignette combines CSS `backdrop-filter: blur(var(--blur))` with a 6-gradient composite `mask-image` to produce smooth, non-linear edge fading without harsh cutoff lines:
1. **4 Radial Gradients**: Positioned at each of the four corners (`bottom right`, `bottom left`, `top left`, `top right`) to calculate smooth corner curvatures based on `--radius`, `--inset`, and `--transition-length`.
2. **2 Linear Gradients**: Horizontal (`to right`) and vertical (`to bottom`) gradients providing the central rectangular window.
3. **Hardware Acceleration**: GPU-accelerated compositing with `-webkit-backdrop-filter` and `-webkit-mask-image` support.

## Exported Components
- `BlurVignette`: Context provider and container matching custom border radius and dimensions.
- `BlurVignetteArticle`: Overlay layer hosting the 6-gradient CSS mask and backdrop filter.

## Integration in ERIS
Applied across the onboarding background scene:
- **Default state**: 90px transition length with 10px blur, keeping central workspace clear while softly blurring viewport edges.
- **Sub-step state** (Sign Up, Sign In, Legal Terms, Verify Email): Transitions smoothly to 160px transition length with 18px blur, focusing visual attention on the active obsidian card.
