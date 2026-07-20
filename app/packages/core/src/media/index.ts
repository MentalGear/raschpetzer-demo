/**
 * Pure, framework-/DOM-free media-viewer gesture math: zoom/pan geometry
 * (`zoomPan`) and the trackpad-swipe one-step-per-gesture reducer (`wheelNav`).
 * Extracted from the Photos Lightbox so a generic full-screen viewer
 * (`@kit/ui`'s `MediaLightbox`) and any future consumer can share the same
 * unit-tested geometry instead of re-deriving it.
 */
export * from './zoomPan'
export * from './wheelNav'
