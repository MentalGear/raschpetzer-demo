<script lang="ts">
	/**
	 * The wikipedia app's left-sidebar STICKY FOOTER (AppShell's `footer` snippet,
	 * +layout.svelte) — global session chrome:
	 *  - the LANGUAGE switcher — per-article data (which locales exist for the article
	 *    currently mounted in `ArticleReader`), bridged up via `wikiStore.activeArticle` since
	 *    this footer is global/route-agnostic (present on every page, not just article ones).
	 *    Hidden when there's no active article or it has no alternate locales; disabled while
	 *    editing that article (switching locale is an in-place mutation of global app state
	 *    that never fires beforeNavigate, so the discard-guard can't intercept it).
	 *  - the member/admin menu (current member header · Review · Members/Settings admin stubs ·
	 *    a switch-member radio group + Log out) when logged in, or a compact "Log in" menu to
	 *    pick a demo member (Ada/Bao/Cleo) when logged out — Edit is login-gated, so this is the
	 *    way back in.
	 *
	 * Previously a top bar (`WikiTopBar.svelte`, sticky via its own `position: sticky`); moved
	 * into `Sidebar.Footer` (AppShell.svelte), which already sticks to the bottom of the docked
	 * sidebar, so no bespoke sticky positioning is needed here — and the per-article language
	 * switcher (previously stuck in ArticleReader's own header row) now has the same global home
	 * as the rest of the app's session chrome.
	 */
	import { goto } from '$app/navigation'
	import { href } from '$lib/paths'
	import {
		memberStore,
		MEMBERS,
		initials,
		type WikiMember,
	} from '$lib/wikipedia/state/memberStore.svelte'
	import { wikiStore } from '$lib/wikipedia/state/wikiStore.svelte'
	import { wikiEdit } from '$lib/wikipedia/content/editStore.svelte'
	import { LOCALE_LABEL, type Locale } from '$lib/wikipedia/data/types'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import * as Avatar from '@kit/ui/shadcn-components/ui/avatar'
	import * as DropdownMenu from '@kit/ui/shadcn-components/ui/dropdown-menu'
	import {
		ClipboardCheck,
		Users,
		Settings,
		LogOut,
		LogIn,
		ChevronDown,
		Globe,
		Check,
	} from '@lucide/svelte'

	const member = $derived(memberStore.currentMember)
	// bits-ui radio value is a string; bind the current member id (or '' when logged out —
	// logging out closes the menu, so the radio isn't shown in that state anyway).
	let activeId = $derived(member?.id ?? '')

	// ── language switcher (per-article — see the file header doc comment) ──────────
	const activeArticle = $derived(wikiStore.activeArticle)
	const otherLocales = $derived(activeArticle ? wikiStore.localesFor(activeArticle.slug) : [])
	const editingActive = $derived(
		wikiEdit.editing && activeArticle != null && wikiEdit.slug === activeArticle.slug,
	)
	function switchLocale(loc: Locale) {
		wikiStore.locale = loc
	}
</script>

<nav aria-label="Session" style="display:contents">
	{#if activeArticle && otherLocales.length > 1}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						variant="outline"
						size="sm"
						class="w-full justify-start gap-2"
						disabled={editingActive}
						title={editingActive
							? 'Finish or discard this edit to switch language'
							: undefined}
						{...props}
					>
						<Globe data-icon="inline-start" />
						{LOCALE_LABEL[activeArticle.locale]}
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" side="top">
				<DropdownMenu.Group>
					{#each otherLocales as loc (loc)}
						<DropdownMenu.Item
							aria-current={loc === activeArticle.locale ? 'true' : undefined}
							onclick={() => switchLocale(loc)}
						>
							{LOCALE_LABEL[loc]}
							{#if loc === activeArticle.locale}<Check class="ml-auto size-4" />{/if}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}

	{#if member}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						variant="ghost"
						size="sm"
						class="w-full justify-start gap-2"
						data-testid="member-menu"
						aria-label={`Member menu — ${member.name}, ${member.roleLabel}`}
						{...props}
					>
						<Avatar.Root class="size-6">
							<Avatar.Fallback class="text-[0.625rem]"
								>{initials(member.name)}</Avatar.Fallback
							>
						</Avatar.Root>
						<span>{member.name}</span>
						<ChevronDown class="ml-auto size-4 text-muted-foreground" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" side="top" class="w-56">
				<DropdownMenu.Label class="flex items-center justify-between gap-2">
					<span>{member.name}</span>
					<Badge variant="secondary">{member.roleLabel}</Badge>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item onSelect={() => (wikiEdit.reviewOpen = true)}>
						<ClipboardCheck data-icon="inline-start" />
						Review
					</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={() => goto(href('/admin/members'))}>
						<Users data-icon="inline-start" />
						Members
					</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={() => goto(href('/admin/settings'))}>
						<Settings data-icon="inline-start" />
						Settings
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<!-- bits-ui renders this RadioGroup as role="group" (not a radiogroup). To give
				     that group an accessible NAME we use a `GroupHeading` INSIDE the RadioGroup —
				     bits wires it via `aria-labelledby`, so the visible "Switch member" text names
				     the group for both sighted and AT users. -->
				<DropdownMenu.RadioGroup
					value={activeId}
					onValueChange={(id) => memberStore.login(id as WikiMember['id'])}
				>
					<DropdownMenu.GroupHeading class="text-xs font-normal text-muted-foreground">
						Switch member
					</DropdownMenu.GroupHeading>
					{#each MEMBERS as m (m.id)}
						<DropdownMenu.RadioItem value={m.id}>
							{m.name}
							<span class="ml-auto text-xs text-muted-foreground">{m.roleLabel}</span>
						</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onSelect={() => memberStore.logout()}>
					<LogOut data-icon="inline-start" />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{:else}
		<!-- Logged-out affordance: pick a demo member to log in as — Edit is login-gated, so this
		     is the re-entry path (no reload, no empty dead-end footer). -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						variant="ghost"
						size="sm"
						class="w-full justify-start gap-2"
						data-testid="login-menu"
						aria-label="Log in"
						{...props}
					>
						<LogIn data-icon="inline-start" />
						Log in
						<ChevronDown class="ml-auto size-4 text-muted-foreground" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" side="top" class="w-56">
				<DropdownMenu.Label class="text-xs font-normal text-muted-foreground"
					>Log in as</DropdownMenu.Label
				>
				<DropdownMenu.Group>
					{#each MEMBERS as m (m.id)}
						<DropdownMenu.Item onSelect={() => memberStore.login(m.id)}>
							<Avatar.Root class="size-6">
								<Avatar.Fallback class="text-[0.625rem]"
									>{initials(m.name)}</Avatar.Fallback
								>
							</Avatar.Root>
							{m.name}
							<span class="ml-auto text-xs text-muted-foreground">{m.roleLabel}</span>
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</nav>
