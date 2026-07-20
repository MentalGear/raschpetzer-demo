<script lang="ts">
	/**
	 * The Review overlay (§D of the floating-edit redesign) — the consensus-gate
	 * approve/quorum workflow, moved OUT of the article body into a right-side Sheet. Mounted
	 * once at the root layout and opened via `wikiEdit.reviewOpen`, since two independent
	 * triggers open it: the sidebar footer's member menu (WikiSidebarFooter.svelte) and the
	 * Publish button when it's blocked on review (EditActionBar.svelte). Because it overlays
	 * (fixed, portalled), opening it never reflows the article — the redesign's zero-shift
	 * constraint holds.
	 *
	 * It reads the app-wide `wikiEdit.session` (the same live `EditSession` the editor drives):
	 * the approve-as-`{reviewer}` buttons, the publish-gate breakdown (allowed / quorum /
	 * eligible approvals / blocks), and the session message all live here now. Save/Publish do
	 * NOT — they stay in the FloatingEditBar (they must work at every viewport width). When
	 * there's no editable change open (no session, or not yet `ready`), it shows an empty state.
	 */
	import { wikiEdit } from '$lib/wikipedia/content/editStore.svelte'
	import { MEMBERS } from '$lib/wikipedia/state/memberStore.svelte'
	import * as Sheet from '@kit/ui/shadcn-components/ui/sheet'
	import * as Empty from '@kit/ui/shadcn-components/ui/empty'
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Separator } from '@kit/ui/shadcn-components/ui/separator'
	import { Check, CircleAlert, FileCheck2, MessagesSquare } from '@lucide/svelte'

	let { open = $bindable(false) }: { open?: boolean } = $props()

	const session = $derived(wikiEdit.session)
	// A change is reviewable once its edit session is open + hydrated (`ready`) — this covers
	// both a dirty (unsaved) draft and a staged change. Loading/error/notFound/no-session all
	// fall through to the empty state.
	const hasChange = $derived(!!session && session.phase === 'ready')
	// The two reviewers (Bao + Cleo) who grant the demo team's quorum of two.
	const reviewers = MEMBERS.slice(1)
	// Who authored the OPEN change (the session actor). Since Edit is login-gated now, any of
	// the three can be the author — so the author may itself be one of the reviewers. A change's
	// author can't grant quorum on their own change (no-self-quorum), so if the author IS a
	// reviewer, that reviewer's own "Approve as X" button is disabled with a hint; the other
	// reviewer + the gate behave normally.
	const authorId = $derived(wikiEdit.actor)
	// With exactly two reviewers and a quorum of two, a change authored BY a reviewer can only
	// ever collect one eligible approval (the other reviewer) — it can't reach quorum. That's a
	// real, reachable dead-end under login gating, so we surface it EXPLICITLY (below) rather than
	// letting the gate read as a silent "one approval short forever." The session-independent
	// review model that fixes it properly is deferred to the multi-role drive (redesign doc §D).
	const authorIsReviewer = $derived(reviewers.some((r) => r.id === authorId))
</script>

<Sheet.Root bind:open>
	<!-- Variant-matched width: the primitive sets `data-[side=right]:w-3/4` (+ sm:max-w-sm),
	     which tailwind-merge does NOT treat as conflicting with a bare `w-full`/`sm:max-w-md`,
	     so those were silently defeated. Match the `data-[side=right]:` variant so full-width
	     actually applies on mobile, capped at md on desktop. -->
	<Sheet.Content
		side="right"
		class="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
	>
		<Sheet.Header>
			<Sheet.Title>Review</Sheet.Title>
			<Sheet.Description>
				Reviewers approve a staged change; Publish then runs the consensus gate + structural
				merge. This demo team needs two approvals (Bao + Cleo).
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
			{#if hasChange && session}
				<section class="flex flex-col gap-3" aria-label="Approvals">
					<h3 class="text-sm font-semibold">Approvals</h3>
					<!-- No-self-quorum rule, made explicit (#5). The copy is author-aware: when a
					     reviewer authored the change the "both reviewers grant quorum" claim is
					     FALSE (that reviewer can't approve their own change), so we say so and name
					     the honest dead-end instead. `id` lets the disabled self-button describe
					     its reason accessibly (title alone isn't announced / a disabled button
					     isn't focusable). -->
					{#if authorIsReviewer}
						<p id="self-quorum-reason" class="text-xs text-muted-foreground">
							This change was authored by a reviewer, who can't approve their own
							change (no self-quorum). The demo team has only two reviewers and needs
							two approvals, so a reviewer's own change can't reach quorum here — a
							known demo limitation. (A session-independent review model is deferred
							to the multi-role work.)
						</p>
					{:else}
						<p id="self-quorum-reason" class="text-xs text-muted-foreground">
							A change's author can't approve their own change (no self-quorum) — the
							reviewers ({reviewers[0].name} and {reviewers[1].name}) grant the demo
							team's quorum of two.
						</p>
					{/if}
					<div class="flex flex-wrap gap-2">
						{#each reviewers as member (member.id)}
							<!-- Each button reflects its OWN outcome: once this reviewer's approval is
							     eligible (in the session evaluation), it flips to a persistent
							     "Approved ✓ {name}" (checked/disabled) so you can see who signed off
							     and can't double-approve. Driven off the session's evaluation, so a
							     later edit (which clears the evaluation) correctly re-opens review. -->
							{@const approved =
								session.evaluation?.eligibleApprovals.includes(member.id) ?? false}
							<!-- No self-approval (#5): if this reviewer authored the open change, they
							     can't grant quorum on it — disable their button with a hint. -->
							{@const isAuthor = member.id === authorId}
							<Button
								variant={approved ? 'secondary' : 'outline'}
								size="sm"
								onclick={() => session.approve(member.id)}
								disabled={approved || isAuthor || session.busy || session.dirty}
								title={isAuthor
									? "You can't approve your own change (no self-quorum)."
									: undefined}
								aria-describedby={isAuthor
									? 'self-quorum-reason edit-status publish-gate'
									: 'edit-status publish-gate'}
							>
								<Check data-icon="inline-start" />
								{approved
									? `Approved ✓ ${member.name}`
									: `Approve as ${member.name}`}
							</Button>
						{/each}
					</div>
					{#if session.dirty}
						<p class="text-xs text-muted-foreground">
							Save your changes before approving — any edit re-opens review.
						</p>
					{/if}

					<div id="publish-gate" aria-live="polite">
						{#if session.evaluation}
							{@const evaluation = session.evaluation}
							<div class="rounded-md border border-border bg-muted/20 p-3 text-sm">
								<div class="flex items-center gap-2">
									{#if evaluation.allowed}
										<Check class="size-4 text-primary" />
										<span>Ready to publish</span>
									{:else}
										<CircleAlert class="size-4 text-destructive" />
										<span>Blocked</span>
									{/if}
								</div>
								<dl
									class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground"
								>
									<dt>Quorum</dt>
									<dd>{evaluation.quorum}</dd>
									<dt>Eligible approvals</dt>
									<dd>{evaluation.eligibleApprovals.length}</dd>
								</dl>
								{#each evaluation.blocks as block, i (i)}
									<p class="mt-1 text-destructive">
										{block.code.replace(/_/g, ' ')}
									</p>
								{/each}
								{#if !evaluation.allowed && authorIsReviewer}
									<!-- Don't let "Blocked / need 2, have 1" read as a transient
									     one-short state: name the structural dead-end explicitly. -->
									<p class="mt-1 text-muted-foreground">
										This change can't reach quorum — its author is one of only
										two reviewers (demo limitation).
									</p>
								{/if}
							</div>
						{/if}
					</div>

					{#if session.message}
						<p
							class="text-sm text-muted-foreground"
							role={session.messageIsError ? 'alert' : 'status'}
						>
							{session.message}
						</p>
					{/if}
					<p class="text-xs text-muted-foreground">
						Publish stays on the editor's floating bar — approve here, then publish
						there.
					</p>
				</section>
			{:else}
				<Empty.Root class="border-none py-10">
					<Empty.Header>
						<Empty.Media variant="icon">
							<FileCheck2 />
						</Empty.Media>
						<Empty.Title>No change is in review yet</Empty.Title>
						<Empty.Description>
							Open an article and click Edit — the approval gate shows up here while a
							change is being edited (Save it before approving).
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{/if}

			<Separator />

			<!-- Discussions placeholder (decision 4): a labeled empty-state — there's no
			     discussion data model in the app yet, so this is a surface stub, not wiring. -->
			<section class="flex flex-col gap-2" aria-label="Discussions">
				<h3 class="text-sm font-semibold">Discussions</h3>
				<Empty.Root class="border-none py-6">
					<Empty.Header>
						<Empty.Media variant="icon">
							<MessagesSquare />
						</Empty.Media>
						<Empty.Title>No discussions yet</Empty.Title>
						<Empty.Description>
							Per-change discussion threads are coming soon.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			</section>
		</div>
	</Sheet.Content>
</Sheet.Root>
