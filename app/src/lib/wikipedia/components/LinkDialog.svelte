<script lang="ts">
	/**
	 * Insert / edit a link in the editor. Two ways in: search the wiki's own topics
	 * (internal wikilink → `/<slug>`) or paste an external URL. Front-end only;
	 * the entity list is the mock corpus. The editor owns the ProseMirror selection — this
	 * dialog only returns an href (or a remove signal) via callbacks.
	 */
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import * as Dialog from '@kit/ui/shadcn-components/ui/dialog'
	import * as Tabs from '@kit/ui/shadcn-components/ui/tabs'
	import { Input } from '@kit/ui/shadcn-components/ui/input'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { ScrollArea } from '@kit/ui/shadcn-components/ui/scroll-area'
	import { cn } from '@kit/ui/shadcn-utils'
	import { isSafeHref } from '$lib/wikipedia/content/safeUrl'

	let {
		open = $bindable(false),
		initialHref = '',
		oninsert,
		onremove,
	}: {
		open?: boolean
		initialHref?: string
		oninsert: (href: string) => void
		onremove: () => void
	} = $props()

	let query = $state('')
	let url = $state('')

	// prefill the URL field from the current link each time the dialog opens.
	$effect(() => {
		if (open) url = initialHref
	})

	const matches = $derived.by(() => {
		const q = query.toLowerCase().trim()
		const all = wikiStore.entities
		const list = q
			? all.filter((e) => e.title.toLowerCase().includes(q) || e.slug.includes(q))
			: all
		return list.slice(0, 8)
	})

	// `isSafeHref` mirrors InlineRuns.svelte's own render-time guard — see safeUrl.ts.
	const safe = (u: string) => (isSafeHref(u) ? u : '')

	function insertInternal(slug: string) {
		// Internal-link hrefs are stored unprefixed (`/${slug}`) — see linkHref.ts. The deploy
		// base path is applied only at render time (InlineRuns.svelte's `href()` call), never
		// baked into the stored mark — doing it here caused a base-path round-trip bug:
		// pageToArticle.ts's `marksOf` sliced off only the leading `/`, leaving `<base>/<slug>`
		// as the "slug" under a non-empty deploy base (e.g. the GitHub Pages preview build).
		oninsert(`/${slug}`)
		open = false
	}
	function insertExternal() {
		const s = safe(url.trim())
		if (s) {
			oninsert(s)
			open = false
		}
	}
	function remove() {
		onremove()
		open = false
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Insert link</Dialog.Title>
			<Dialog.Description>Link to a wiki topic, or paste an external URL.</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root value="internal">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="internal">Wiki topic</Tabs.Trigger>
				<Tabs.Trigger value="external">External URL</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="internal" class="mt-3">
				<Input
					placeholder="Search topics…"
					bind:value={query}
					aria-label="Search wiki topics"
				/>
				<ScrollArea class="mt-2 h-56">
					<ul class="flex flex-col gap-1 pr-3">
						{#each matches as e (e.id)}
							<li>
								<button
									type="button"
									onclick={() => insertInternal(e.slug)}
									class={cn(
										'flex w-full flex-col gap-0.5 rounded-md border border-border p-2 text-left transition-colors hover:bg-accent/40',
										'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
									)}
								>
									<span class="text-sm font-medium text-foreground"
										>{e.title}</span
									>
									<span class="line-clamp-1 text-xs text-muted-foreground"
										>{e.blurb}</span
									>
								</button>
							</li>
						{:else}
							<li class="p-2 text-sm text-muted-foreground">No matching topics.</li>
						{/each}
					</ul>
				</ScrollArea>
			</Tabs.Content>

			<Tabs.Content value="external" class="mt-3">
				<form
					onsubmit={(e) => {
						e.preventDefault()
						insertExternal()
					}}
				>
					<Input
						type="url"
						placeholder="https://example.org"
						bind:value={url}
						aria-label="External URL"
					/>
					<div class="mt-3 flex justify-between gap-2">
						{#if initialHref}
							<Button type="button" variant="ghost" onclick={remove}
								>Remove link</Button
							>
						{:else}
							<span></span>
						{/if}
						<Button type="submit" disabled={safe(url.trim()) === ''}>Insert</Button>
					</div>
				</form>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
