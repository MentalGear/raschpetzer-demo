<script lang="ts">
	/**
	 * The save-state badge + Save + Publish action cluster — extracted from `FloatingEditBar`
	 * so it can render in TWO places at once: the top of the desktop right-side panel (above
	 * Quick facts/ToC, ArticleReader.svelte) and, as a fallback, the mobile/tablet floating bar
	 * (FloatingEditBar.svelte, `lg:hidden` there) since the right panel is desktop-only
	 * (`hidden lg:block`) and editing must stay reachable at every viewport width.
	 *
	 * Both instances read the SAME `session`, so `idPrefix` namespaces this component's element
	 * ids (`edit-status`/`publish-block-reason`) — two simultaneously-mounted copies with the
	 * same id would be invalid HTML and break `aria-describedby`/`getElementById` (only the
	 * first match would ever be found).
	 *
	 * Publish behavior: when the session is ready to publish, it's an enabled "Publish" button
	 * (existing behavior). When it's dirty, it stays a disabled "Publish" (save first). When it's
	 * saved but BLOCKED on review (evaluation exists, not allowed — i.e. quorum unmet), the
	 * button relabels to show the approval count and, instead of attempting a blocked publish,
	 * opens the Review sheet (`wikiEdit.reviewOpen` — see editStore.svelte.ts's doc comment for
	 * why that state lives there rather than in either component that renders this).
	 */
	import { Button } from '@kit/ui/shadcn-components/ui/button'
	import { Badge } from '@kit/ui/shadcn-components/ui/badge'
	import { wikiEdit } from '../content/editStore.svelte'
	import type { EditSession } from '../content/editSession.svelte'

	let {
		session,
		onPublish,
		idPrefix,
		class: className,
	}: { session: EditSession; onPublish: () => void; idPrefix: string; class?: string } = $props()

	const statusId = $derived(`edit-status-${idPrefix}`)
	const reasonId = $derived(`publish-block-reason-${idPrefix}`)

	// Blocked specifically on review (not on unsaved edits) — see the file header doc comment.
	const needsReview = $derived(
		!session.dirty && session.evaluation != null && !session.evaluation.allowed,
	)
	const need = $derived(session.evaluation?.quorum ?? 2)
	const have = $derived(session.evaluation?.eligibleApprovals.length ?? 0)
	const publishLabel = $derived(needsReview ? `Review (${have}/${need})` : 'Publish')
	const publishBlockReason = $derived(
		session.busy || session.canPublish || needsReview
			? ''
			: session.dirty
				? 'Save your change before publishing.'
				: `Blocked — needs ${need} approval${need === 1 ? '' : 's'}; open Review from the member menu.`,
	)

	function onPublishClick() {
		if (needsReview) {
			wikiEdit.reviewOpen = true
			return
		}
		onPublish()
	}
</script>

<div class={className}>
	<span aria-live="polite">
		<Badge id={statusId} variant={session.dirty ? 'default' : 'secondary'}>
			{session.dirty ? 'Unsaved changes' : 'All changes saved'}
		</Badge>
	</span>
	<Button
		size="sm"
		variant="outline"
		onclick={() => session.save()}
		disabled={!session.canSave}
		aria-describedby={statusId}
	>
		Save
	</Button>
	<Button
		size="sm"
		data-testid={`publish-button-${idPrefix}`}
		onclick={onPublishClick}
		disabled={session.busy || (!needsReview && !session.canPublish)}
		aria-describedby={`${statusId} ${reasonId}`}
	>
		{publishLabel}
	</Button>
	<!-- Always present (empty when publishable/needs-review) so the aria-describedby id never
	     dangles; sr-only reason when Publish is blocked on unsaved/quorum, kept polite so it
	     doesn't nag on every keystroke. -->
	<span id={reasonId} class="sr-only" aria-live="polite">{publishBlockReason}</span>
</div>
