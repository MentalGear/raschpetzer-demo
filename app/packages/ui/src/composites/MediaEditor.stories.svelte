<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf'
	import { expect, userEvent, waitFor, fn } from 'storybook/test'
	import MediaEditor from './MediaEditor.svelte'
	import type { MediaEdit } from './mediaEdit'

	// Domain-free, in-memory, network-free demo source — MediaEditor is BYO-image
	// (never a domain `Photo`), so the story draws its own gradient onto a canvas
	// and bakes it to a Blob rather than depending on any real photo/network asset.
	function makeDemoImageBlob(): Promise<Blob> {
		const canvas = document.createElement('canvas')
		canvas.width = 640
		canvas.height = 480
		const ctx = canvas.getContext('2d')
		if (!ctx) return Promise.reject(new Error('2D context unavailable'))
		const gradient = ctx.createLinearGradient(0, 0, 640, 480)
		gradient.addColorStop(0, '#4f46e5')
		gradient.addColorStop(1, '#ec4899')
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, 640, 480)
		ctx.fillStyle = 'rgba(255,255,255,0.85)'
		ctx.fillRect(220, 160, 200, 160)
		return new Promise((resolve, reject) => {
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
				'image/png',
			)
		})
	}

	const onCancelSpy = fn()

	// A pre-existing MediaEdit across every tool — proves the composite's own headline
	// contract (non-destructive: `edit` is re-applied over `source`, re-opening restores
	// every tool's prior value instead of the default) in isolation from any app's storage
	// plumbing. apps/photos/tests/media_editor.spec.ts's "Reopen contract" test proves the
	// full round trip through Lightbox's own UI (drive the UI → commit → reopen → re-check);
	// this story instead asserts the composite renders a GIVEN record correctly on first
	// mount — the half of the contract a new consumer (e.g. Wikipedia's Figure) actually
	// depends on, decoupled from how Photos happens to store the record between edits.
	const presetEdit: MediaEdit = {
		crop: { x: 0.1, y: 0.125, w: 0.5, h: 0.5 }, // → 64,60,320,240 px on the 640×480 demo source
		rotate: 90,
		flipHorizontal: true,
		straighten: 5,
		redactions: [{ x: 0.2, y: 0.2, w: 0.3, h: 0.25, style: 'blur' }],
		metadata: { strip: false, fields: { artist: 'Reopen Test Photographer' } },
	}

	const { Story } = defineMeta({
		title: 'Composites/MediaEditor',
		component: MediaEditor,
		tags: ['autodocs'],
		parameters: {
			// Full-screen overlay — the default Storybook canvas padding fights it.
			layout: 'fullscreen',
		},
	})
</script>

<script lang="ts">
	import { onMount } from 'svelte'

	let demoSource = $state.raw<Blob>()
	onMount(async () => {
		demoSource = await makeDemoImageBlob()
	})
</script>

<!-- Default: full tool set (crop/rotate/straighten/redact/metadata), as Photos uses it. -->
<Story name="Default" asChild>
	{#if demoSource}
		<MediaEditor source={demoSource} onCommit={() => {}} onCancel={() => {}} />
	{/if}
</Story>

<!-- Minimal tool set: what a Wikipedia Figure-style consumer would pass (no metadata). -->
<Story name="Minimal tools (crop + redact)" asChild>
	{#if demoSource}
		<MediaEditor
			source={demoSource}
			tools={['crop', 'redact']}
			onCommit={() => {}}
			onCancel={() => {}}
		/>
	{/if}
</Story>

<!--
  Reopen contract (rule 10's keyboard interaction is satisfied via the Redact tab's
  Tab-to-select + Enter below): mounts with a fully-populated `edit` prop and asserts
  every tool's controls reflect it — crop numeric fields, rotate/flip readout, straighten
  angle, the redaction list + its numeric fields (selected via keyboard, not a click), and
  the metadata strip checkbox + Artist field. Also asserts the reopened editor's OWN
  history starts clean (Undo disabled) — reopening isn't itself an undo step.
-->
<Story
	name="Reopen an existing edit"
	asChild
	play={async ({ canvasElement }) => {
		let overlay: HTMLElement | null = null
		await waitFor(async () => {
			overlay = canvasElement.querySelector('.editor-overlay')
			await expect(overlay).not.toBeNull()
		})
		if (!overlay) return
		const dialog = overlay

		const cropTab = Array.from(
			dialog.querySelectorAll<HTMLElement>('button[aria-pressed]'),
		).find((b) => b.textContent?.includes('Crop'))
		cropTab?.click()
		await waitFor(async () => {
			await expect((dialog.querySelector('#me-crop-w') as HTMLInputElement)?.value).toBe(
				'320',
			)
		})
		await expect((dialog.querySelector('#me-crop-h') as HTMLInputElement).value).toBe('240')
		await expect((dialog.querySelector('#me-crop-x') as HTMLInputElement).value).toBe('64')
		await expect((dialog.querySelector('#me-crop-y') as HTMLInputElement).value).toBe('60')

		const rotateTab = Array.from(
			dialog.querySelectorAll<HTMLElement>('button[aria-pressed]'),
		).find((b) => b.textContent?.includes('Rotate'))
		rotateTab?.click()
		await waitFor(async () => {
			await expect(dialog.querySelector('[data-testid="rotate-readout"]')?.textContent).toBe(
				'Output rotation: 90°',
			)
		})
		await expect(
			dialog.querySelector('[data-testid="flip-horizontal"]')?.getAttribute('aria-pressed'),
		).toBe('true')

		const straightenTab = Array.from(
			dialog.querySelectorAll<HTMLElement>('button[aria-pressed]'),
		).find((b) => b.textContent?.includes('Straighten'))
		straightenTab?.click()
		await waitFor(async () => {
			await expect(
				dialog.querySelector('[data-testid="straighten-angle"]')?.textContent,
			).toBe('5.0°')
		})

		const redactTab = Array.from(
			dialog.querySelectorAll<HTMLElement>('button[aria-pressed]'),
		).find((b) => b.textContent?.includes('Redact'))
		redactTab?.click()
		const regionBtn = await waitFor(() => {
			const btn = dialog.querySelector<HTMLElement>('[data-testid="redact-select-0"]')
			if (!btn) throw new Error('redaction not found')
			return btn
		})
		await expect(regionBtn.textContent).toContain('Region 1')
		await expect(regionBtn.textContent).toContain('Blur')
		// Keyboard-select it (Tab-reachable button, not a mouse click) — the numeric fields
		// are the PRIMARY, keyboard-operable path per docs/kit/components/media-editor.md.
		regionBtn.focus()
		await userEvent.keyboard('{Enter}')
		await waitFor(async () => {
			await expect((dialog.querySelector('#me-redact-0-x') as HTMLInputElement)?.value).toBe(
				'128',
			)
		})

		const metadataTab = Array.from(
			dialog.querySelectorAll<HTMLElement>('button[aria-pressed]'),
		).find((b) => b.textContent?.includes('Metadata'))
		metadataTab?.click()
		await waitFor(async () => {
			// The shadcn Checkbox is a Bits UI button (role="checkbox"), not a native
			// <input> — state lives in the `data-state` attribute, not `.checked`.
			await expect(
				dialog.querySelector('#me-metadata-strip')?.getAttribute('data-state'),
			).toBe('unchecked')
		})
		await expect((dialog.querySelector('#me-metadata-artist') as HTMLInputElement).value).toBe(
			'Reopen Test Photographer',
		)

		// Reopening isn't itself an undo step — the history starts clean. Icon-only button
		// (Undo2 + aria-label="Undo", no visible text), so select by aria-label, not textContent.
		const undoBtn = dialog.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')
		await expect(undoBtn?.disabled).toBe(true)
	}}
>
	{#if demoSource}
		<MediaEditor
			source={demoSource}
			edit={presetEdit}
			onCommit={() => {}}
			onCancel={() => {}}
		/>
	{/if}
</Story>

{#snippet keyboardDemo(onCancel: () => void)}
	{#if demoSource}
		<MediaEditor source={demoSource} onCommit={() => {}} {onCancel} />
	{/if}
{/snippet}

<!--
  Keyboard + a11y interaction test (rule 10):
  - Waits for the overlay to mount (the demo source loads asynchronously via
    canvas.toBlob) and asserts initial focus lands on the Cancel button (the
    dialog's own focus-management contract).
  - Tabs to the "Rotate" tool tab and activates it via Enter (keyboard-only tool
    switch, not a click) and asserts the panel actually switched.
  - Presses Escape and asserts onCancel fires — the dialog's keyboard-dismiss path.
-->
<Story
	name="Keyboard interaction"
	asChild
	play={async ({ canvasElement }) => {
		let overlay: HTMLElement | null = null
		await waitFor(async () => {
			overlay = canvasElement.querySelector('.editor-overlay')
			await expect(overlay).not.toBeNull()
		})
		if (!overlay) return

		const cancelBtn = overlay.querySelector<HTMLElement>('[data-testid="media-editor-cancel"]')
		await expect(cancelBtn).not.toBeNull()
		await waitFor(async () => {
			await expect(document.activeElement).toBe(cancelBtn)
		})

		const rotateButton = Array.from(
			overlay.querySelectorAll<HTMLElement>('button[aria-pressed]'),
		).find((b) => b.textContent?.includes('Rotate'))
		await expect(rotateButton).not.toBeNull()
		if (!rotateButton) return
		rotateButton.focus()
		await userEvent.keyboard('{Enter}')
		await waitFor(async () => {
			await expect(rotateButton.getAttribute('aria-pressed')).toBe('true')
		})
		await expect(overlay.querySelector('[data-testid="rotate-readout"]')).not.toBeNull()

		// Live-region announcement (aria-live="polite" role="status") is the SOLE non-visual
		// feedback channel for a screen-reader user driving a canvas-based tool — assert it
		// actually narrates a real action, not just that the element exists.
		const rotateCw = overlay.querySelector<HTMLElement>('[data-testid="rotate-cw"]')
		await expect(rotateCw).not.toBeNull()
		rotateCw?.click()
		await waitFor(async () => {
			await expect(overlay?.querySelector('.sr-live')?.textContent).toContain('Rotated right')
		})

		await userEvent.keyboard('{Escape}')
		await waitFor(async () => {
			await expect(onCancelSpy).toHaveBeenCalled()
		})
	}}
>
	{@render keyboardDemo(onCancelSpy)}
</Story>

<!--
  Focus-trap wraparound (rule 10's keyboard interaction): reuses the SAME selector
  `trapTab` itself uses (button/input, not disabled, not tabindex="-1") to find the true
  last focusable control in the default (no-edit-history) state — Undo/Redo start
  disabled, so the last real stop is inside the crop tool's numeric form, not the
  history buttons. Regression guard for a real, previously-shipped bug: a disabled
  trailing control (Redo, before any edit exists) breaking last-element detection so Tab
  from the true last focusable control escaped the dialog instead of wrapping to Cancel.
-->
<Story
	name="Focus trap wraparound"
	asChild
	play={async ({ canvasElement }) => {
		let overlay: HTMLElement | null = null
		await waitFor(async () => {
			overlay = canvasElement.querySelector('.editor-overlay')
			await expect(overlay).not.toBeNull()
		})
		if (!overlay) return

		const cancelBtn = overlay.querySelector<HTMLElement>('[data-testid="media-editor-cancel"]')
		await expect(cancelBtn).not.toBeNull()

		const focusable = overlay.querySelectorAll<HTMLElement>(
			'button:not([tabindex="-1"]):not(:disabled), input:not([tabindex="-1"]):not(:disabled), [tabindex]:not([tabindex="-1"])',
		)
		await expect(focusable.length).toBeGreaterThan(0)
		const last = focusable[focusable.length - 1]
		last.focus()
		await expect(document.activeElement).toBe(last)

		await userEvent.keyboard('{Tab}')
		await waitFor(async () => {
			await expect(document.activeElement).toBe(cancelBtn)
		})
	}}
>
	{#if demoSource}
		<MediaEditor source={demoSource} onCommit={() => {}} onCancel={() => {}} />
	{/if}
</Story>
