<script lang="ts">
	/** Light/dark/auto theme select — shared by the hub and the app shell so the
	 *  toggle isn't reimplemented per surface. Reflects the user's stored
	 *  preference (`userPrefersMode`), not just the resolved `mode` — so "System"
	 *  stays selected even while the OS is currently dark. */
	import { userPrefersMode, setMode } from 'mode-watcher'
	import { Sun, Moon, Monitor } from '@lucide/svelte'
	import * as Select from '@kit/ui/shadcn-components/ui/select'
	import { cn } from '@kit/ui/shadcn-utils'

	interface Props {
		/** merged onto the select trigger (rule 13) */
		class?: string
	}
	let { class: className }: Props = $props()

	const THEME_OPTS = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor },
	] as const

	const current = $derived(
		THEME_OPTS.find((o) => o.value === userPrefersMode.current) ?? THEME_OPTS[2],
	)
</script>

<Select.Root
	type="single"
	value={userPrefersMode.current}
	onValueChange={(v) => v && setMode(v as 'light' | 'dark' | 'system')}
>
	<Select.Trigger size="sm" class={cn('touch-target gap-1.5', className)} aria-label="Theme">
		<current.icon aria-hidden="true" />
		{current.label}
	</Select.Trigger>
	<Select.Content aria-label="Theme options">
		<Select.Group>
			{#each THEME_OPTS as opt (opt.value)}
				<Select.Item value={opt.value} label={opt.label}>
					<opt.icon aria-hidden="true" />
					{opt.label}
				</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
