/**
 * EditSession unit tests — the async flow in isolation, against a controllable fake
 * backend (no DOM/editor needed; runs in the browser project because it's a runes
 * store). Covers the paths review rounds found bugs in: uniform error handling, the
 * stale-result guards on save/approve/publish, CAS recovery, and the publish outcomes.
 */
import { describe, it, expect } from 'vitest'
import { EditSession } from './editSession.svelte'
import type {
	Change,
	Commit,
	ContentBackend,
	PublishEvaluation,
	PublishResult,
} from './thesoria/contentBackend'
import type { Page, Locale } from './schema'

const PAGE: Page = { schemaVersion: 1, slug: 'cats', locale: 'en', title: 'Cats', elements: [] }
const ALLOWED: PublishEvaluation = { allowed: true, quorum: 0, eligibleApprovals: [], blocks: [] }

function deferred<T>() {
	let resolve!: (v: T) => void
	let reject!: (e: unknown) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

/** A ContentBackend whose stage/approve/publish/evaluate can be overridden per test. */
class FakeBackend implements ContentBackend {
	pageValue: Page | null = PAGE
	headKey = 'h0'
	evaluation: PublishEvaluation = ALLOWED
	loadPageImpl?: () => Promise<Page | null>
	stageImpl?: (a: { baseHeadKey: string }) => Promise<{ headKey: string }>
	approveImpl?: () => Promise<void>
	publishImpl?: () => Promise<PublishResult>

	async loadPage(): Promise<Page | null> {
		return this.loadPageImpl ? this.loadPageImpl() : this.pageValue
	}
	async history(): Promise<Commit[]> {
		return []
	}
	async openChange(a: { slug: string; locale: Locale }): Promise<Change> {
		return { id: 'chg', slug: a.slug, locale: a.locale, baseHeadKey: this.headKey }
	}
	async loadChange(): Promise<{ page: Page; headKey: string; base: Page }> {
		return { page: this.pageValue!, headKey: this.headKey, base: this.pageValue! }
	}
	async stage(a: { baseHeadKey: string }): Promise<{ headKey: string }> {
		if (this.stageImpl) return this.stageImpl(a)
		this.headKey = 'h1'
		return { headKey: 'h1' }
	}
	async approve(): Promise<void> {
		if (this.approveImpl) return this.approveImpl()
	}
	async object(): Promise<{ objectionId: string }> {
		return { objectionId: 'o' }
	}
	async resolveObjection(): Promise<void> {}
	async evaluate(): Promise<PublishEvaluation> {
		return this.evaluation
	}
	async publish(): Promise<PublishResult> {
		if (this.publishImpl) return this.publishImpl()
		return { published: true, page: this.pageValue!, headKey: 'h2' }
	}
	async resolveConflicts(): Promise<{ headKey: string }> {
		return { headKey: 'h3' }
	}
}

function make(backend: ContentBackend = new FakeBackend()) {
	return new EditSession({ slug: 'cats', locale: 'en', actor: 'ada', backend })
}
const editedPage = (title: string): Page => ({ ...PAGE, title })

describe('EditSession.load', () => {
	it('hydrates to ready with the page, headKey, and gate state', async () => {
		const s = make()
		await s.load()
		expect(s.phase).toBe('ready')
		expect(s.page?.title).toBe('Cats')
		expect(s.headKey).toBe('h0')
		expect(s.evaluation).toEqual(ALLOWED)
		expect(s.canPublish).toBe(true) // allowed + not dirty
	})

	it('goes to notFound when the page is absent', async () => {
		const b = new FakeBackend()
		b.loadPageImpl = async () => null
		const s = make(b)
		await s.load()
		expect(s.phase).toBe('notFound')
	})

	it('goes to error (not stuck loading) when a backend call throws', async () => {
		const b = new FakeBackend()
		b.loadPageImpl = async () => {
			throw new Error('network')
		}
		const s = make(b)
		await s.load()
		expect(s.phase).toBe('error')
		expect(s.messageIsError).toBe(true)
		expect(s.message).toContain('network')
	})
})

describe('EditSession.edit', () => {
	it('marks dirty and invalidates prior review', async () => {
		const s = make()
		await s.load()
		s.edit(editedPage('Cats!'))
		expect(s.dirty).toBe(true)
		expect(s.page?.title).toBe('Cats!')
		expect(s.evaluation).toBe(null)
		expect(s.canSave).toBe(true)
		expect(s.canPublish).toBe(false) // dirty → can't publish
	})
})

describe('EditSession.save', () => {
	it('stages, clears dirty, advances headKey, refreshes the gate', async () => {
		const s = make()
		await s.load()
		s.edit(editedPage('Cats!'))
		await s.save()
		expect(s.dirty).toBe(false)
		expect(s.headKey).toBe('h1')
		expect(s.message).toBe('Saved as a staged change.')
		expect(s.canPublish).toBe(true)
	})

	it('drops the clean transition if an edit lands mid-stage (stale-guard), but still advances headKey', async () => {
		const b = new FakeBackend()
		const gate = deferred<{ headKey: string }>()
		b.stageImpl = () => gate.promise
		const s = make(b)
		await s.load()
		s.edit(editedPage('v1'))
		const saving = s.save()
		s.edit(editedPage('v2')) // newer edit lands while stage is in flight
		gate.resolve({ headKey: 'h1' })
		await saving
		expect(s.headKey).toBe('h1') // advanced regardless
		expect(s.dirty).toBe(true) // still dirty — newer edit not saved
		expect(s.message).toContain('newer unsaved edits')
	})

	it('surfaces an error and resets busy when stage throws', async () => {
		const b = new FakeBackend()
		b.stageImpl = async () => {
			throw new Error('boom')
		}
		const s = make(b)
		await s.load()
		s.edit(editedPage('x'))
		await s.save()
		expect(s.messageIsError).toBe(true)
		expect(s.message).toContain('Save failed')
		expect(s.busy).toBe(false)
	})

	it('refreshes headKey on a CAS non_fast_forward so a retry can succeed', async () => {
		const b = new FakeBackend()
		b.headKey = 'h0'
		b.stageImpl = async () => {
			b.headKey = 'h9' // backend moved on
			throw new Error('non_fast_forward')
		}
		const s = make(b)
		await s.load()
		s.edit(editedPage('x'))
		await s.save()
		expect(s.message).toContain('non_fast_forward')
		expect(s.headKey).toBe('h9') // refreshed from loadChange
	})
})

describe('EditSession.approve', () => {
	it('updates the evaluation', async () => {
		const b = new FakeBackend()
		const s = make(b)
		await s.load()
		b.evaluation = { allowed: false, quorum: 2, eligibleApprovals: ['bao'], blocks: [] }
		await s.approve('bao')
		expect(s.evaluation?.quorum).toBe(2)
	})

	it('does not resurrect a stale evaluation over a newer edit', async () => {
		const b = new FakeBackend()
		const gate = deferred<void>()
		b.approveImpl = () => gate.promise
		const s = make(b)
		await s.load()
		const approving = s.approve('bao')
		s.edit(editedPage('mid')) // newer edit → evaluation nulled
		gate.resolve()
		await approving
		expect(s.evaluation).toBe(null) // stale result dropped
		expect(s.dirty).toBe(true)
	})
})

describe('EditSession.publish', () => {
	it('calls onPublished on success', async () => {
		const s = make()
		await s.load()
		let published = false
		await s.publish(() => {
			published = true
		})
		expect(published).toBe(true)
	})

	it('surfaces a blocked gate without navigating', async () => {
		const b = new FakeBackend()
		const evaluation: PublishEvaluation = {
			allowed: false,
			quorum: 2,
			eligibleApprovals: [],
			blocks: [{ code: 'quorum_not_met', have: 0, need: 2 }],
		}
		b.publishImpl = async () => ({ blocked: true, evaluation })
		const s = make(b)
		await s.load()
		let published = false
		await s.publish(() => {
			published = true
		})
		expect(published).toBe(false)
		expect(s.messageIsError).toBe(true)
		expect(s.message).toContain('blocked')
		expect(s.evaluation?.allowed).toBe(false)
	})

	it('surfaces a conflict without navigating', async () => {
		const b = new FakeBackend()
		b.publishImpl = async () => ({
			conflict: true,
			conflicts: [{ path: 'title', label: 'Title', base: 'a', ours: 'b', theirs: 'c' }],
		})
		const s = make(b)
		await s.load()
		let published = false
		await s.publish(() => {
			published = true
		})
		expect(published).toBe(false)
		expect(s.messageIsError).toBe(true)
		expect(s.message).toContain('conflict')
	})
})
