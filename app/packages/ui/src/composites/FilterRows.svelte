<script lang="ts" module>
	/** One filter field the rows can choose from. Omit `values` for a boolean
	 * field (the field alone is the predicate, e.g. "Favorites"). */
	export type FilterFieldDef = {
		id: string
		label: string
		values?: {
			id: string
			label: string
			/** Shown instead of `label` in the CLOSED value trigger once this value is
			 *  selected (e.g. a plain "blue" instead of a dropdown-only "blue (145)" live
			 *  count). Omit to keep showing `label` in both places (pre-existing behavior). */
			shortLabel?: string
		}[]
		/** placeholder shown in the value Select before a value is picked */
		valuePlaceholder?: string
	}
	/** One operator a row's field/value pair can be combined with (e.g. "is"/"is not"),
	 *  rendered as a 3rd Select between the field and value Selects. */
	export type FilterOperatorDef = { id: string; label: string }
	/** A single filter row. `id` is owned by the component (stable for keying).
	 *  `operator` is optional — omit the `operators` prop entirely for the original
	 *  2-part row (field, value); existing consumers that never set it are unaffected. */
	export type FilterRow = { id: number; field: string; operator?: string; value: string }
</script>

<script lang="ts">
	/**
	 * Generic, domain-free "add filter" rows: each row is
	 * `[field Select] [operator Select?] [value Select?] [remove]`, plus an "Add filter"
	 * button. The component owns row identity, add/remove, and the value reset on field
	 * change; the consumer supplies the field definitions and applies the resulting rows as
	 * predicates (bring-your-own-data — the rows are just a value model).
	 *
	 * The operator Select (`operators` prop, e.g. "is"/"is not") is purely additive — omit
	 * it for the original 2-part row. Added 2026-07-18 for `DataTable`'s `facetStyle: 'rows'`
	 * (see `docs/kit/components/data-table.md`), which needed rows to express exclusion
	 * ("Color is not Blue"), not just inclusion.
	 *
	 * Domain-free: no `$lib/photos` import (enforced by eslint). Reusable across
	 * apps (Notes: tag/notebook/date; products: brand/price; …).
	 */
	import { tick } from 'svelte'
	import { cn } from '@kit/ui/shadcn-utils'
	import * as Select from '@kit/ui/shadcn-components/ui/select'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { X, Plus } from '@lucide/svelte'

	interface Props {
		/** the fields a row may filter by */
		fields: FilterFieldDef[]
		/** Operators shown between the field and value Selects (e.g. "is"/"is not").
		 *  Omit for the original 2-part row (field, value) — purely additive, existing
		 *  consumers unaffected. When provided, a new row defaults to the FIRST operator so
		 *  the value Select is reachable without an extra, otherwise-pointless click just to
		 *  pick the default operator. */
		operators?: FilterOperatorDef[]
		/** the current rows (two-way bindable); also fires `onValueChange` on every change */
		value?: FilterRow[]
		/**
		 * Called after every mutation to `value` (add/remove row, field or value change).
		 * Follows the Bits UI / shadcn-svelte controlled/uncontrolled pattern: bind `value`
		 * for two-way control, or use `onValueChange` for uncontrolled observation. Both
		 * work simultaneously — `$bindable` keeps two-way consumers in sync; `onValueChange`
		 * notifies one-way consumers.
		 */
		onValueChange?: (value: FilterRow[]) => void
		/** restrict each field to at most one row (avoids same-field AND → ∅) */
		oneRowPerField?: boolean
		fieldPlaceholder?: string
		addLabel?: string
		/** width/util classes for the field, operator, and value triggers */
		fieldClass?: string
		operatorClass?: string
		valueClass?: string
		/** Extra class(es) merged onto the root element via `cn()`. */
		class?: string
	}
	let {
		fields,
		operators,
		value = $bindable([]),
		onValueChange,
		oneRowPerField = false,
		fieldPlaceholder = 'Choose field…',
		addLabel = 'Add filter',
		fieldClass = 'w-40',
		operatorClass = 'w-28',
		valueClass = 'w-44',
		class: className,
	}: Props = $props()

	const fieldDef = (id: string) => fields.find((f) => f.id === id)
	const labelOf = (opts: { id: string; label: string }[] | undefined, v: string) =>
		opts?.find((o) => o.id === v)?.label
	// Prefers `shortLabel` for the CLOSED trigger's display text once a value is selected —
	// `label` (with any "(count)" suffix) stays reserved for the dropdown's own option list.
	const shortLabelOf = (
		opts: { id: string; label: string; shortLabel?: string }[] | undefined,
		v: string,
	) => {
		const o = opts?.find((o) => o.id === v)
		return o?.shortLabel ?? o?.label
	}

	// With one-row-per-field, a row may pick its own field plus any not used elsewhere.
	const fieldsFor = (row: FilterRow) =>
		oneRowPerField
			? fields.filter(
					(f) =>
						f.id === row.field ||
						!value.some((r) => r.id !== row.id && r.field === f.id),
				)
			: fields
	const allFieldsUsed = $derived(
		oneRowPerField && fields.every((f) => value.some((r) => r.field === f.id)),
	)

	let rootEl = $state<HTMLElement>()

	function addRow() {
		const id = value.reduce((m, r) => Math.max(m, r.id), -1) + 1
		value = [...value, { id, field: '', operator: operators?.[0]?.id ?? '', value: '' }]
		onValueChange?.(value)
	}
	async function removeRow(id: number) {
		const idx = value.findIndex((r) => r.id === id)
		value = value.filter((r) => r.id !== id)
		onValueChange?.(value)
		// A11y: the clicked "Remove" button just unmounted — move focus to a sensible
		// neighbor (the remove button now at that index, else the last one, else the
		// "Add filter" button) so a keyboard user isn't dropped to <body>.
		await tick()
		const removes = rootEl?.querySelectorAll<HTMLElement>('[data-filter-remove]')
		if (removes && removes.length) {
			removes[Math.min(idx, removes.length - 1)]?.focus()
		} else {
			rootEl?.querySelector<HTMLElement>('[data-filter-add]')?.focus()
		}
	}
</script>

<div bind:this={rootEl} class={cn('flex flex-col gap-2', className)}>
	{#each value as row, i (row.id)}
		{@const def = fieldDef(row.field)}
		<div class="flex items-center gap-2">
			<Select.Root
				type="single"
				value={row.field}
				onValueChange={(v) => {
					// Reassign the whole array (never mutate a row in place) -- mirrors
					// addRow/removeRow below, so this keeps working even if a future
					// caller stores `rows` as `$state.raw` (deep-proxying skipped, so an
					// in-place `row.field = v` would silently stop propagating).
					value = value.map((r) => (r.id === row.id ? { ...r, field: v, value: '' } : r))
					onValueChange?.(value)
				}}
			>
				<Select.Trigger class={fieldClass} aria-label="Filter field, row {i + 1}"
					>{def?.label ?? fieldPlaceholder}</Select.Trigger
				>
				<Select.Content aria-label="Filter field options">
					<Select.Group>
						{#each fieldsFor(row) as f (f.id)}
							<Select.Item value={f.id} label={f.label} />
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>

			{#if operators?.length && def?.values}
				<Select.Root
					type="single"
					value={row.operator || operators[0].id}
					onValueChange={(v) => {
						value = value.map((r) => (r.id === row.id ? { ...r, operator: v } : r))
						onValueChange?.(value)
					}}
				>
					<Select.Trigger
						class={operatorClass}
						aria-label="{def?.label ?? 'Filter'} operator, row {i + 1}"
						>{labelOf(operators, row.operator || operators[0].id)}</Select.Trigger
					>
					<Select.Content aria-label="Filter operator options">
						<Select.Group>
							{#each operators as op (op.id)}
								<Select.Item value={op.id} label={op.label} />
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			{/if}

			{#if def?.values}
				<Select.Root
					type="single"
					value={row.value}
					onValueChange={(v) => {
						// set from the callback arg (don't rely on bind:value flushing
						// before the emit) so the emitted snapshot is never stale. Reassign the
						// whole array (never mutate the row in place) -- mirrors addRow/removeRow
						// above, so a future `$state.raw`-stored `rows` caller still sees the edit.
						value = value.map((r) => (r.id === row.id ? { ...r, value: v } : r))
						onValueChange?.(value)
					}}
				>
					<Select.Trigger
						class={valueClass}
						aria-label="{def?.label ?? 'Filter'} value, row {i + 1}"
						title={labelOf(def.values, row.value)}
						>{shortLabelOf(def.values, row.value) ??
							def.valuePlaceholder ??
							'Any'}</Select.Trigger
					>
					<Select.Content aria-label="Filter value options">
						<Select.Group>
							{#each def.values as o (o.id)}
								<Select.Item value={o.id} label={o.label} />
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			{/if}

			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Remove {def?.label ?? ''} filter, row {i + 1}"
				data-filter-remove
				onclick={() => removeRow(row.id)}
			>
				<X aria-hidden="true" />
			</Button>
		</div>
	{/each}

	<div>
		<Button
			variant="outline"
			size="sm"
			data-filter-add
			onclick={addRow}
			disabled={allFieldsUsed}
		>
			<Plus data-icon="inline-start" aria-hidden="true" />
			{addLabel}
		</Button>
	</div>
</div>
