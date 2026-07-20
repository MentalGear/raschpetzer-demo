/**
 * The article corpus. Originally a deterministic, hand-authored GENERIC encyclopedia
 * corpus (per the source app's PRD decision — content deliberately domain-neutral); this
 * fork replaced that with real content about the Raschpëtzer, a Roman-era qanat near
 * Walferdange, Luxembourg — see `./raschpetzer.ts` and its sibling `./raschpetzer-*.ts`
 * modules (one per article, each importing/registering into the exports below). Static
 * (no RNG, no DOM, no network) so reading/virtualization/VRT stay reproducible.
 */
import type { Article, Block, Category, Entity } from './types'
import { raschpetzer, archaeologyCategory } from './raschpetzer'
import { shafts } from './raschpetzer-shafts'
import { galleryArticle } from './raschpetzer-gallery'
import { geologyArticle } from './raschpetzer-geology'
import { guyWaringoArticle } from './raschpetzer-guy-waringo'
import { sonjaFaberArticle } from './raschpetzer-sonja-faber'
import { henriWernerArticle } from './raschpetzer-henri-werner'
import { photographersArticle } from './raschpetzer-photographers'
import { nicolasKohlArticle } from './raschpetzer-nicolas-kohl'
import { georgesFaberArticle } from './raschpetzer-georges-faber'
import { walferdangeArticle, walferdangeEntities } from './raschpetzer-walferdange'
import { helmsangeArticle } from './raschpetzer-helmsange'
import { alzetteArticle } from './raschpetzer-alzette'
import { petschendArticle } from './raschpetzer-petschend'
import { qanatArticle } from './raschpetzer-qanat-concept'

/** fixed "now" so relative dates + buckets are reproducible (matches Photos/Notes). */
export const REF_NOW = Date.UTC(2026, 5, 1)

// ── categories ──────────────────────────────────────────────────────────────────
export const categories: Category[] = [
	{ id: 'history', label: 'History', description: 'People, places, and events of the past.' },
	{ id: 'technology', label: 'Technology', description: 'Engineering, tools, and techniques.' },
	archaeologyCategory,
]

// ── entities (hover-preview cards + wikilink autocomplete) ────────────────────────
export const entities: Entity[] = [...walferdangeEntities]

// ── articles ──────────────────────────────────────────────────────────────────────
export const articles: Article[] = [
	raschpetzer,
	shafts,
	galleryArticle,
	geologyArticle,
	guyWaringoArticle,
	sonjaFaberArticle,
	henriWernerArticle,
	photographersArticle,
	nicolasKohlArticle,
	georgesFaberArticle,
	walferdangeArticle,
	helmsangeArticle,
	alzetteArticle,
	petschendArticle,
	qanatArticle,
]

/**
 * A progressively-refined earlier draft of the first content block — same `id`, different
 * signature — so the block reads as a growing text prefix across the revisions and
 * therefore diffs as `changed` on *each* transition, not only the last one. `frac` is the
 * fraction of the final text this draft retains (`< 1` for every non-final revision; the
 * final revision uses the full block). Text-based so it works for a single-run paragraph
 * or a heading, not only multi-run paragraphs.
 */
function draftOf(block: Block, frac: number): Block {
	if (block.type === 'paragraph' && block.runs.length > 0) {
		const full = block.runs.map((r) => r.text).join('')
		const keep = Math.round(full.length * frac)
		if (keep >= full.length || keep < 8) return block
		return { ...block, runs: [{ text: `${full.slice(0, keep).trimEnd()}…` }] }
	}
	if (block.type === 'heading') {
		const keep = Math.round(block.text.length * frac)
		if (keep >= block.text.length || keep < 4) return block
		return { ...block, text: `${block.text.slice(0, keep).trimEnd()}…` }
	}
	return block
}

// Synthesize a plausible edit history so a block-level (semantic) diff between
// consecutive revisions exercises every status — not just appends:
//   • growth: earlier revisions carry fewer trailing blocks → later revisions `add` them;
//   • refinement: the first content block is a progressively longer draft → each transition
//     `changes` it (draftOf keeps `(i + 1) / n` of the text at revision `i`, all of it at the end);
//   • pruning: every non-final revision carries the same transient work-in-progress block,
//     dropped in the final revision → it `removes` on the last transition.
// The latest revision equals the current blocks. Deterministic (no RNG). Applied to
// source (en) articles only; localized variants keep their own (empty) revision arrays.
const TRANSIENT: Block = {
	id: 'wip-draft',
	type: 'paragraph',
	runs: [{ text: 'Work-in-progress note, removed before publication.' }],
}
for (const a of articles) {
	if (a.locale !== 'en' || a.revisions.length === 0) continue
	const base = a.blocks
	const n = a.revisions.length
	a.revisions.forEach((rev, i) => {
		if (i === n - 1) {
			rev.blocks = base // latest revision == the current article
			return
		}
		const cut = Math.max(1, Math.round(((i + 1) / n) * base.length))
		const kept = base.slice(0, cut).map((blk, j) => (j === 0 ? draftOf(blk, (i + 1) / n) : blk))
		rev.blocks = [...kept, TRANSIENT]
	})
}
