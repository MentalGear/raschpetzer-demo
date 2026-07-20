/**
 * Real content: a standalone deep-dive on shaft P-4 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg), notable among the qanat's shafts for its dry-stone lining and its overflow
 * weir. A companion sub-article to `./raschpetzer-shafts.ts` (the shaft inventory, which
 * covers P-4 briefly) and `./raschpetzer-gallery.ts` (which covers the overflow weir and its
 * lateral channel in full engineering detail as part of the gallery/channel article) — see
 * those files' headers for the source repo (`raschpetzer-model-digital-3d`:
 * `data/shafts.json`, `docs/RASCHPETZER_DATA.md`) and the primary-source brochure they cite
 * (vendored at `static/sources/`). This article's job is the SHAFT itself — its depth,
 * floor elevation, and dry-stone lining construction — so the weir is only pointed to here,
 * not re-explained; see `raschpetzer-gallery`'s "The P-4 overflow weir" section for that.
 * Every specific fact/number carries its own adjacent citation. Page locators come from
 * `data/shafts.json`'s per-field `_prov.loc` entries for the "P-4" record.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/mock.ts's tiny inline-run authoring helpers — kept
// separate (not imported from either) so this module has no circular dependency on them.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths need the GitHub Pages project-subpath base prefixed by hand — see
 *  raschpetzer.ts's `asset()` for the full rationale (works locally, 404s in prod otherwise
 *  without it). */
const asset = (path: string): string => `${base}${path}`

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.loc` fields for
// the "P-4" record / docs/RASCHPETZER_DATA.md's "Shaft notes" — plain page/#page anchors
// into the vendored PDF, opened new tab (same pattern as raschpetzer.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	depth: {
		id: 'c-shaft-pminus4-depth',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20, fig. 6-8 — shaft P-4 depth and floor elevation)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	lining: {
		id: 'c-shaft-pminus4-lining',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20, fig. 5-11 — shaft P-4 dry-stone lining)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	diameter: {
		id: 'c-shaft-pminus4-diameter',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 31 — shaft P-4 base diameter)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=31`,
	},
	dating: {
		id: 'c-shaft-pminus4-dating',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 12, fig. 3-1 — western continuation campaign, 1992–2000)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=12`,
	},
	overflowPointer: {
		id: 'c-shaft-pminus4-overflow-pointer',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20, fig. 5-11, 5-14 — the P-4 overflow weir)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
} satisfies Record<string, Citation>

export const raschpetzerShaftPMinus4Citations = c

export const shaftPMinus4Article: Article = {
	id: 'a-shaft-p-4',
	slug: 'shaft-p-4',
	locale: 'en',
	title: 'Shaft P-4',
	summary:
		'Shaft P-4 is one of the vertical access shafts of the Raschpëtzer qanat, notable for its dry-stone lining — a 0.8 m wall built up in three concentric, mortar-free rows — and for the overflow weir fitted into the channel beside it, which diverts excess water into a separate lateral channel.',
	categories: ['archaeology'],
	infobox: [
		{ label: 'Site', value: 'Raschpëtzer qanat, Helmsange Forest, Walferdange, Luxembourg' },
		{ label: 'Role', value: 'Main-line vertical access shaft' },
		{ label: 'Depth', value: '12 m' },
		{ label: 'Floor elevation', value: '355.4 m a.s.l.' },
		{ label: 'Lining', value: 'Dry-stone, 0.8 m wall, 3 concentric rows' },
		{ label: 'Base', value: 'Widened to a 1.4 m cone' },
		{ label: 'Excavated', value: '1992 (western continuation campaign, 1992–2000)' },
		{ label: 'Surface today', value: 'Windowed viewing cover, over the overflow bifurcation' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('P-4'),
				t(' is one of the vertical access shafts of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(', roughly halfway along the western leg of the route (see the full '),
				link('shaft inventory', 'raschpetzer-shafts'),
				t(' for its neighbours). It reaches '),
				cite(
					'12 metres down to a gallery floor at 355.4 metres above sea level',
					'c-shaft-pminus4-depth',
				),
				t(
					', and is one of the ten excavated shafts along the route capped today with a modern surface structure — in this case a windowed cover, so visitors can look down into the channel without entering it.',
				),
			),
		},
		{ id: 'h-lining', type: 'heading', level: 2, text: 'Dry-stone lining' },
		{
			id: 'p-lining',
			type: 'paragraph',
			runs: p(
				t('P-4 is '),
				cite(
					'dry-stone lined: its wall is 0.8 metres thick, built up in three concentric rows',
					'c-shaft-pminus4-lining',
				),
				t(
					' of stone laid course on course without mortar, each row facing the shaft wall and bearing against the row outside it. Building the lining as three separate concentric rings, rather than one thick wall, let the masons work in courses they could actually lift and place by hand while still giving the lining enough total thickness to resist the lateral earth pressure of the surrounding sandstone — a masonry technique also seen, in reduced form, at other shafts along the route.',
				),
				cite(
					' At its base, the shaft widens out to a 1.4-metre cone,',
					'c-shaft-pminus4-diameter',
				),
				t(
					' a flared profile that eases the transition from the narrow lined shaft into the gallery below and gives a slightly larger sump at the point where the shaft meets the channel.',
				),
			),
		},
		{ id: 'h-overflow', type: 'heading', level: 2, text: 'The overflow weir' },
		{
			id: 'p-overflow',
			type: 'paragraph',
			runs: p(
				t('Immediately beside the shaft, the main channel is fitted with an '),
				cite(
					'overflow weir that diverts water into a separate lateral channel',
					'c-shaft-pminus4-overflow-pointer',
				),
				t(
					' whenever the level in the main conduit rises too high — the reason the shaft head above it carries a windowed cover rather than a plain lid. The weir and its lateral channel are a piece of channel engineering distinct from the shaft itself; see ',
				),
				link('Gallery and Channel Construction', 'raschpetzer-gallery'),
				t(
					'\'s "The P-4 overflow weir" section for the trigger level, diversion capacity, and the surveyed location of its resurgence outlet.',
				),
			),
		},
		{ id: 'h-dating', type: 'heading', level: 2, text: 'Excavation' },
		{
			id: 'p-dating',
			type: 'paragraph',
			runs: p(
				cite(
					'P-4 was reached during the western-continuation campaign that ran from 1992 to 2000,',
					'c-shaft-pminus4-dating',
				),
				t(
					' extending the excavated gallery further west from the shafts already opened in the 1986 rediscovery.',
				),
			),
		},
	],
	citations: [c.depth, c.lining, c.diameter, c.dating, c.overflowPointer],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft from the site SSOT dataset (data/shafts.json) and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
