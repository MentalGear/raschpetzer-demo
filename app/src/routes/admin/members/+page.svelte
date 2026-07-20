<script lang="ts">
	/** Admin stub (§D): a simple list of the demo members + their roles, reached from the
	 *  member-only top-bar menu. Real member management is out of scope for the demo. */
	import { MEMBERS, memberStore, initials } from '$lib/wikipedia/state/memberStore.svelte'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import * as Avatar from '@kit/ui/shadcn-components/ui/avatar'
	import { PathBar } from '@kit/ui'

	const current = $derived(memberStore.currentMember)
</script>

<svelte:head><title>Members — Wikipedia</title></svelte:head>

<div class="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
	<!-- "Admin" is an inert grouping label (no href — there's no /admin index route, only the
	     member-menu that opens these siblings), naming the surface for wayfinding. -->
	<PathBar
		class="mb-2"
		segments={[
			{ id: 'admin', label: 'Admin' },
			{ id: 'current', label: 'Members' },
		]}
	/>
	<h1 class="mb-1 text-2xl font-bold tracking-tight">Members</h1>
	<p class="mb-6 text-sm text-muted-foreground">
		The demo team behind the consensus gate — one editor and two reviewers.
	</p>
	<ul class="flex flex-col divide-y divide-border">
		{#each MEMBERS as member (member.id)}
			<li class="flex items-center gap-3 py-3">
				<Avatar.Root class="size-9">
					<Avatar.Fallback class="text-xs">{initials(member.name)}</Avatar.Fallback>
				</Avatar.Root>
				<span class="font-medium">{member.name}</span>
				{#if current?.id === member.id}
					<Badge variant="outline">You</Badge>
				{/if}
				<Badge variant="secondary" class="ml-auto">{member.roleLabel}</Badge>
			</li>
		{/each}
	</ul>
</div>
