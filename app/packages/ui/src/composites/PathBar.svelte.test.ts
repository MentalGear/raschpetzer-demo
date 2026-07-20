import { render } from 'vitest-browser-svelte'
import { afterEach, expect, test, vi } from 'vitest'
import PathBar, { type PathBarSegment } from './PathBar.svelte'

// Real-browser (vitest-browser-svelte) tests. The responsive collapse is MEASURED
// (ResizeObserver + scrollWidth), so it needs real layout. This env doesn't load the
// app's Tailwind, so for the collapse tests we inject the exact layout the composite's
// `flex-nowrap/overflow-hidden/[&>li]:shrink-0` classes produce — that isolates and
// validates the reflow LOGIC (the new code); the classes themselves are exercised
// in-app via the story + VRT.

const seg = (id: string, label: string, href?: string): PathBarSegment => ({ id, label, href })

// A deep trail with long, NON-overlapping labels (no label is a substring of another).
const deep: PathBarSegment[] = [
	seg('a', 'Home', '/'),
	seg('b', 'Natural Sciences', '/c/sci'),
	seg('c', 'Applied Physics', '/c/phys'),
	seg('d', 'Heat and Energy', '/c/thermo'),
	seg('e', 'The Carnot Cycle'), // current (no href)
]

const ellipsisTrigger = (root: Element) => root.querySelector('[aria-label*="hidden path segment"]')

// The measured layout the collapsible classes produce (Tailwind isn't loaded here).
let layoutStyle: HTMLStyleElement | undefined
function forceMeasuredLayout() {
	layoutStyle = document.createElement('style')
	layoutStyle.textContent = `
		nav[aria-label="breadcrumb"] ol { display: flex; flex-wrap: nowrap; overflow: hidden; align-items: center; gap: 6px; }
		nav[aria-label="breadcrumb"] li { flex-shrink: 0; white-space: nowrap; }
	`
	document.head.appendChild(layoutStyle)
}
afterEach(() => {
	layoutStyle?.remove()
	layoutStyle = undefined
})

test('renders the full trail (no … menu) when it fits', async () => {
	const screen = render(PathBar, { segments: deep })
	// wide by default (full test viewport) → nothing collapsed
	await expect.element(screen.getByText('Home', { exact: true })).toBeInTheDocument()
	await expect.element(screen.getByText('Heat and Energy', { exact: true })).toBeInTheDocument()
	expect(ellipsisTrigger(screen.container)).toBeNull()
})

test('collapses the middle into a … menu when too narrow, keeping first + last', async () => {
	forceMeasuredLayout()
	const screen = render(PathBar, { segments: deep })
	// Constrain the nav so the nowrap/overflow list overflows; the ResizeObserver drives reflow.
	const nav = screen.container.querySelector('nav[aria-label="breadcrumb"]') as HTMLElement
	nav.style.width = '180px'

	await vi.waitFor(() => expect(ellipsisTrigger(screen.container)).not.toBeNull(), {
		timeout: 3000,
	})

	// first + last (current) stay visible; the reader nav landmark holds
	await expect.element(screen.getByText('Home', { exact: true })).toBeInTheDocument()
	await expect.element(screen.getByText('The Carnot Cycle', { exact: true })).toBeInTheDocument()

	// the … trigger is an accessibly-labelled button
	const trigger = ellipsisTrigger(screen.container) as HTMLElement
	expect(trigger.tagName).toBe('BUTTON')

	// opening it reveals a folded middle segment as a real link
	trigger.click()
	await vi.waitFor(() => expect(document.querySelector('a[href="/c/sci"]')).not.toBeNull())
})

test('re-expands when the container grows back (converges to the tightest fit)', async () => {
	forceMeasuredLayout()
	const screen = render(PathBar, { segments: deep })
	const nav = screen.container.querySelector('nav[aria-label="breadcrumb"]') as HTMLElement
	nav.style.width = '180px'
	await vi.waitFor(() => expect(ellipsisTrigger(screen.container)).not.toBeNull(), {
		timeout: 3000,
	})
	// widen with ample room → the … menu disappears again (all segments fit)
	nav.style.width = '2000px'
	await vi.waitFor(() => expect(ellipsisTrigger(screen.container)).toBeNull(), { timeout: 3000 })
	await expect.element(screen.getByText('Natural Sciences', { exact: true })).toBeInTheDocument()
})

test('a ≤2-segment trail never collapses (renders in full, unchanged)', async () => {
	forceMeasuredLayout()
	const two: PathBarSegment[] = [seg('a', 'Collections', '/collections'), seg('b', 'Album title')]
	const screen = render(PathBar, { segments: two })
	const nav = screen.container.querySelector('nav[aria-label="breadcrumb"]') as HTMLElement
	nav.style.width = '40px' // absurdly narrow
	await new Promise((r) => setTimeout(r, 100))
	expect(ellipsisTrigger(screen.container)).toBeNull()
	await expect.element(screen.getByText('Collections', { exact: true })).toBeInTheDocument()
	await expect.element(screen.getByText('Album title', { exact: true })).toBeInTheDocument()
})

test('collapsible={false} keeps the full trail even when narrow', async () => {
	forceMeasuredLayout()
	const screen = render(PathBar, { segments: deep, collapsible: false })
	const nav = screen.container.querySelector('nav[aria-label="breadcrumb"]') as HTMLElement
	nav.style.width = '180px'
	await new Promise((r) => setTimeout(r, 150))
	expect(ellipsisTrigger(screen.container)).toBeNull()
	await expect.element(screen.getByText('Natural Sciences', { exact: true })).toBeInTheDocument()
})
