<script lang="ts">
	/** Admin stub (§D): a settings placeholder reached from the member-only top-bar menu. */
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import { Settings } from '@lucide/svelte'
	import { PathBar } from '@kit/ui'
</script>

<svelte:head><title>Settings — Raschpëtzer</title></svelte:head>

<div class="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
	<PathBar
		class="mb-2"
		segments={[
			{ id: 'admin', label: 'Admin' },
			{ id: 'current', label: 'Settings' },
		]}
	/>
	<h1 class="mb-6 text-2xl font-bold tracking-tight">Settings</h1>
	<Empty.Root class="rounded-lg border border-dashed border-border py-16">
		<Empty.Header>
			<Empty.Media variant="icon">
				<Settings />
			</Empty.Media>
			<Empty.Title>Coming soon</Empty.Title>
			<Empty.Description>
				Team and workspace settings for the wiki will live here.
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
</div>
