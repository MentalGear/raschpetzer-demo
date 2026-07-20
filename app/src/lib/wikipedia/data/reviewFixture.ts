/**
 * Structured-review demo fixture: a base article revision plus two diverging branch
 * revisions (`branchA`/`branchB`), a discussion thread, and a set of block-replacement
 * suggestions — everything a diff/merge/discussion UI needs to demo against real,
 * typed data. Deterministic (no RNG, no `Date.now`), hand-authored prose about the
 * Raschpëtzer, a Roman-era qanat near Steinsel, Luxembourg.
 *
 * `branchA`/`branchB` are constructed so that `mergeBlocks(base.blocks, branchA.blocks,
 * branchB.blocks)` (see `../diff/blockMerge.ts`) exercises every `MergeStatus` at least
 * once — see the per-block comments below for which status each block drives, and
 * `reviewFixture.test.ts` for the assertion that pins this down (so the fixture can't
 * silently drift out of exercising the engine). Pure TS, no DOM.
 */
import type { Block, Revision } from './types'
import type { DiscussionComment, BlockSuggestion } from '../diff/blockMerge'

const DAY = 86_400_000
const BASE_TS = Date.UTC(2026, 2, 1) // 2026-03-01
const BRANCH_TS = BASE_TS + 10 * DAY

// ── base revision ──────────────────────────────────────────────────────────────
// 8 blocks. Ids are stable across base/branchA/branchB — that's the merge key.

/** unchanged in both branches → `unchanged`. */
const hTitle: Block = { id: 'h-title', type: 'heading', level: 2, text: 'Raschpëtzer' }

/** edited in branchA only, branchB matches base → `changed-a`. */
const pOverviewBase: Block = {
	id: 'p-overview',
	type: 'paragraph',
	runs: [
		{
			text: 'The Raschpëtzer is a Roman-era qanat — a gently sloping underground gallery built to tap groundwater — located near Steinsel in central Luxembourg. It is regarded as the northernmost known example of Persian-style qanat engineering anywhere in the Roman world.',
		},
	],
}

/** edited in branchB only (a date fix), branchA matches base → `changed-b`. */
const pDiscoveryBase: Block = {
	id: 'p-discovery',
	type: 'paragraph',
	runs: [
		{ text: 'The gallery was first surveyed in ' },
		{ text: '1803', marks: { bold: true } },
		{ text: ', when local quarry workers broke into one of its buried access shafts.' },
	],
}

/** both branches append the SAME sentence → `changed-both-agree`. */
const pConstructionBase: Block = {
	id: 'p-construction',
	type: 'paragraph',
	runs: [
		{
			text: 'Roman engineers cut the gallery through the local sandstone by hand, following a shallow downward gradient toward the valley floor so that water would flow under gravity alone.',
		},
	],
}

/** both branches edit it, but to DIFFERENT content → `conflict` (both-changed-differ). */
const listFeaturesBase: Block = {
	id: 'list-features',
	type: 'list',
	ordered: true,
	items: [
		[{ text: 'Length: about 600 meters of surveyed gallery' }],
		[{ text: 'Depth: up to 5 meters below the surface' }],
		[{ text: 'Access shafts: more than 30 documented vertical shafts' }],
	],
}

/** branchA drops it, branchB keeps it unchanged → `removed` (base+b carried). */
const quoteVisitorBase: Block = {
	id: 'quote-visitor',
	type: 'quote',
	runs: [
		{
			text: 'Walking the gallery today, one senses the same careful patience the Roman surveyors must have needed centuries ago.',
		},
	],
	attribution: 'Dr. Hélène Arnaud, La Revue Archéologique du Luxembourg (2003)',
}

/** branchA edits it, branchB deletes it → `conflict` (changed-vs-removed, a-side). */
const calloutAccessBase: Block = {
	id: 'callout-access',
	type: 'callout',
	variant: 'info',
	title: 'Visiting the Raschpëtzer',
	runs: [
		{
			text: 'The gallery is open to guided tours on the first Saturday of each month, April through October.',
		},
	],
}

/** both branches drop it → `removed` (base only). */
const pLegacyBase: Block = {
	id: 'p-legacy',
	type: 'paragraph',
	runs: [
		{
			text: 'The site remains under the joint stewardship of the Luxembourg National Museum of Archaeology and the commune of Steinsel, and has been proposed for inclusion on national heritage inventories.',
		},
	],
}

const baseBlocks: Block[] = [
	hTitle,
	pOverviewBase,
	pDiscoveryBase,
	pConstructionBase,
	listFeaturesBase,
	quoteVisitorBase,
	calloutAccessBase,
	pLegacyBase,
]

export const base: Revision = {
	id: 'rev-base',
	author: 'Iris Baumann',
	ts: BASE_TS,
	summary: 'Initial article on the Raschpëtzer qanat',
	blocks: baseBlocks,
}

// ── branchA ─────────────────────────────────────────────────────────────────────
const pOverviewA: Block = {
	id: 'p-overview',
	type: 'paragraph',
	runs: [
		{
			text: 'The Raschpëtzer is a Roman-era qanat — a gently sloping underground gallery built to tap groundwater — located near Steinsel in central Luxembourg. It is the northernmost known example of Persian-style qanat engineering identified anywhere in the Roman world, and one of only a handful known north of the Alps.',
		},
	],
}
const pConstructionAgreed: Block = {
	id: 'p-construction',
	type: 'paragraph',
	runs: [
		{
			text: 'Roman engineers cut the gallery through the local sandstone by hand, following a shallow downward gradient toward the valley floor so that water would flow under gravity alone, using vertical shafts spaced at regular intervals for ventilation and spoil removal.',
		},
	],
}
const listFeaturesA: Block = {
	id: 'list-features',
	type: 'list',
	ordered: true,
	items: [
		[{ text: 'Length: about 620 meters of surveyed gallery' }],
		[{ text: 'Depth: up to 5 meters below the surface' }],
		[{ text: 'Access shafts: more than 30 documented vertical shafts' }],
	],
}
const calloutAccessA: Block = {
	id: 'callout-access',
	type: 'callout',
	variant: 'info',
	title: 'Visiting the Raschpëtzer',
	runs: [
		{
			text: 'The gallery is open to guided tours every Saturday, April through October, following a renewed access agreement with the landowner.',
		},
	],
}
/** present only in branchA (base absent, branchB absent) → `added-a`. */
const pNewA: Block = {
	id: 'p-new-a',
	type: 'paragraph',
	runs: [
		{
			text: 'A 2019 geophysical survey identified two further candidate shafts east of the known gallery, suggesting the qanat may originally have extended further than previously mapped.',
		},
	],
}

const branchABlocks: Block[] = [
	hTitle,
	pOverviewA,
	pDiscoveryBase, // unchanged from base on the A side
	pConstructionAgreed,
	listFeaturesA,
	// quote-visitor dropped
	calloutAccessA,
	// p-legacy dropped
	pNewA,
]

export const branchA: Revision = {
	id: 'rev-branch-a',
	author: 'Théo Reuter',
	ts: BRANCH_TS,
	summary: 'Tighten intro, note wider shaft survey, refresh visiting hours',
	blocks: branchABlocks,
}

// ── branchB ─────────────────────────────────────────────────────────────────────
const pDiscoveryB: Block = {
	id: 'p-discovery',
	type: 'paragraph',
	runs: [
		{ text: 'The gallery was first surveyed in ' },
		{ text: '1935', marks: { bold: true } },
		{ text: ', when local quarry workers broke into one of its buried access shafts.' },
	],
}
const listFeaturesB: Block = {
	id: 'list-features',
	type: 'list',
	ordered: true,
	items: [
		[{ text: 'Length: about 600 meters of surveyed gallery' }],
		[{ text: 'Depth: up to 5 meters below the surface' }],
		[{ text: 'Access shafts: more than 35 documented vertical shafts' }],
	],
}
/**
 * Independently written but content-identical to branchA's `pConstructionAgreed` — a
 * distinct object literal (not the same reference) so `changed-both-agree` models two
 * editors converging on the same wording rather than one shared edit reused twice.
 */
const pConstructionB: Block = {
	id: 'p-construction',
	type: 'paragraph',
	runs: [
		{
			text: 'Roman engineers cut the gallery through the local sandstone by hand, following a shallow downward gradient toward the valley floor so that water would flow under gravity alone, using vertical shafts spaced at regular intervals for ventilation and spoil removal.',
		},
	],
}

/** present only in branchB (base absent, branchA absent) → `added-b`. */
const pNewB: Block = {
	id: 'p-new-b',
	type: 'paragraph',
	runs: [
		{
			text: "In 2021, the commune of Steinsel opened talks with national heritage authorities about nominating the Raschpëtzer for Luxembourg's UNESCO tentative list.",
		},
	],
}

const branchBBlocks: Block[] = [
	hTitle,
	pOverviewBase, // unchanged from base on the B side
	pDiscoveryB,
	pConstructionB, // same agreed text as branchA, independent object
	listFeaturesB,
	quoteVisitorBase, // kept unchanged
	// callout-access dropped
	// p-legacy dropped
	pNewB,
]

export const branchB: Revision = {
	id: 'rev-branch-b',
	author: 'Nora Schmit',
	ts: BRANCH_TS,
	summary: 'Correct discovery date, revise shaft count, drop stale visiting info',
	blocks: branchBBlocks,
}

// ── discussion comments (anchored to base block ids) ────────────────────────────
const cShaftCountRoot: DiscussionComment = {
	id: 'c-shaft-count-root',
	anchorId: 'list-features',
	author: 'Amélie Muller',
	ts: BASE_TS + 2 * DAY,
	text: 'Can we confirm the shaft count against the 2019 survey report before publishing either revision?',
	state: 'open',
}
/** a reply thread on the same anchor. */
const cShaftCountReply: DiscussionComment = {
	id: 'c-shaft-count-reply',
	anchorId: 'list-features',
	parentId: cShaftCountRoot.id,
	author: 'Théo Reuter',
	ts: BASE_TS + 3 * DAY,
	text: "Good catch — I'll cross-check with the survey PDF and update the count either way.",
	state: 'open',
}
const cVisitingHoursResolved: DiscussionComment = {
	id: 'c-visiting-hours',
	anchorId: 'callout-access',
	author: 'Nora Schmit',
	ts: BASE_TS + DAY,
	text: 'The opening hours here look outdated — worth verifying with the commune?',
	state: 'resolved',
}

export const comments: DiscussionComment[] = [
	cShaftCountRoot,
	cShaftCountReply,
	cVisitingHoursResolved,
]

// ── suggestions (proposed Block replacements) ────────────────────────────────────
/**
 * Anchored at `p-discovery`, which is unchanged between `base` and `branchA` — so
 * `resolveBlockAnchor('p-discovery', branchA.blocks, base.blocks)` resolves `'resolved'`.
 */
const sClarifyDiscovery: BlockSuggestion = {
	id: 's-clarify-discovery',
	anchorId: 'p-discovery',
	author: 'Amélie Muller',
	ts: BASE_TS + 4 * DAY,
	rationale: 'Name the surveyor and cite the source for the date, not just the year.',
	proposed: {
		id: 'p-discovery',
		type: 'paragraph',
		runs: [
			{ text: 'The gallery was first surveyed in ' },
			{ text: '1803', marks: { bold: true } },
			{
				text: ' by the Grand-Ducal Institute, after local quarry workers broke into one of its buried access shafts.',
			},
		],
	},
	state: 'proposed',
}

/**
 * Anchored at `p-overview`, which IS edited in `branchA` — so
 * `resolveBlockAnchor('p-overview', branchA.blocks, base.blocks)` resolves `'changed'`.
 */
const sTightenIntro: BlockSuggestion = {
	id: 's-tighten-intro',
	anchorId: 'p-overview',
	author: 'Nora Schmit',
	ts: BASE_TS + 5 * DAY,
	rationale: 'Lead with the location before the classification, for readability.',
	proposed: {
		id: 'p-overview',
		type: 'paragraph',
		runs: [
			{
				text: 'Near Steinsel in central Luxembourg lies the Raschpëtzer, a Roman-era qanat: a gently sloping underground gallery built to tap groundwater. It is the northernmost known example of Persian-style qanat engineering in the Roman world.',
			},
		],
	},
	state: 'proposed',
}

/**
 * Anchored at `p-legacy`, which both branches drop — so it is absent from `branchA`/
 * `branchB` and `resolveBlockAnchor('p-legacy', branchA.blocks, base.blocks)` resolves
 * `'orphaned'` (the `origin` argument is short-circuited for an orphaned anchor — it's
 * only consulted to distinguish `'resolved'` from `'changed'` when the anchor is present).
 */
const sExpandLegacy: BlockSuggestion = {
	id: 's-expand-legacy',
	anchorId: 'p-legacy',
	author: 'Iris Baumann',
	ts: BASE_TS + 6 * DAY,
	rationale: 'Add the museum inventory reference before this paragraph is finalized either way.',
	proposed: {
		id: 'p-legacy',
		type: 'paragraph',
		runs: [
			{
				text: 'The site remains under the joint stewardship of the Luxembourg National Museum of Archaeology and the commune of Steinsel, and is listed in the national heritage inventory (ref. MNA-2014-118).',
			},
		],
	},
	state: 'proposed',
}

export const suggestions: BlockSuggestion[] = [sClarifyDiscovery, sTightenIntro, sExpandLegacy]

// ── the fixture ──────────────────────────────────────────────────────────────────
export const reviewFixture = {
	base,
	branchA,
	branchB,
	comments,
	suggestions,
}
