<script lang="ts">
	/**
	 * Edit the article's "Quick facts" infobox rows (label/value pairs). Opened via the
	 * click-to-edit affordance on the infobox aside while editing (`ArticleReader.svelte`).
	 * Scoped to editing an EXISTING infobox's rows (add/remove/edit) — this dialog is only
	 * reachable when the article already has an infobox; it never introduces a net-new
	 * infobox aside where none existed (that DOM element only appearing in edit mode would
	 * be a zero-shift risk, and isn't needed for this demo's fixtures).
	 * Front-end only — see `infoboxFieldSchema` in `schema.ts` for the KG-population note.
	 */
	import * as Dialog from '@kit/ui/shadcn-components/ui/dialog'
	import * as Field from '@kit/ui/shadcn-components/ui/field'
	import { Input } from '@kit/ui/shadcn-components/ui/input'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Plus, Trash2 } from '@lucide/svelte'
	import type { InfoboxField } from '$lib/wikipedia/content/schema'

	let {
		open = $bindable(false),
		fields: initialFields,
		onsave,
	}: {
		open?: boolean
		fields: InfoboxField[]
		onsave: (fields: InfoboxField[]) => void
	} = $props()

	let rows = $state<InfoboxField[]>([])

	// prefill from the current infobox each time the dialog opens.
	$effect(() => {
		if (open) rows = initialFields.map((f) => ({ ...f }))
	})

	function addRow() {
		rows = [...rows, { label: '', value: '' }]
	}
	function removeRow(i: number) {
		rows = rows.filter((_, idx) => idx !== i)
	}
	const valid = $derived(
		rows.length > 0 && rows.every((r) => r.label.trim() !== '' && r.value.trim() !== ''),
	)
	function save() {
		if (!valid) return
		onsave(rows.map((r) => ({ label: r.label.trim(), value: r.value.trim() })))
		open = false
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit quick facts</Dialog.Title>
			<Dialog.Description
				>Structured label/value rows shown in the infobox.</Dialog.Description
			>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault()
				save()
			}}
		>
			<Field.FieldGroup class="max-h-80 gap-3 overflow-y-auto pr-1">
				{#each rows as row, i (i)}
					<Field.Field orientation="horizontal" class="items-start gap-2">
						<div class="flex flex-1 flex-col gap-1.5">
							<Field.FieldLabel for={`infobox-label-${i}`} class="sr-only"
								>Label</Field.FieldLabel
							>
							<Input
								id={`infobox-label-${i}`}
								placeholder="Label"
								bind:value={row.label}
							/>
						</div>
						<div class="flex flex-1 flex-col gap-1.5">
							<Field.FieldLabel for={`infobox-value-${i}`} class="sr-only"
								>Value</Field.FieldLabel
							>
							<Input
								id={`infobox-value-${i}`}
								placeholder="Value"
								bind:value={row.value}
							/>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={`Remove ${row.label || 'row'} row`}
							onclick={() => removeRow(i)}
						>
							<Trash2 />
						</Button>
					</Field.Field>
				{/each}
			</Field.FieldGroup>

			<Button type="button" variant="outline" class="mt-3" onclick={addRow}>
				<Plus data-icon="inline-start" />Add row
			</Button>

			<div class="mt-4 flex justify-end gap-2">
				<Button type="button" variant="ghost" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={!valid}>Save</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
