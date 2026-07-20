/**
 * Real content: the two auxiliary shafts of the Raschpëtzer qanat, P-5A and P-7A
 * (Walferdange, Luxembourg). A companion deep-dive sub-article to `./raschpetzer.ts`,
 * `./raschpetzer-shafts.ts`, and `./raschpetzer-gallery.ts` — see `raschpetzer.ts`'s header
 * for the source repo (`raschpetzer-model-digital-3d`: `data/shafts.json`,
 * `data/gallery.json`'s `gallery.auxiliaryChannel`, `docs/RASCHPETZER_DATA.md`) and the
 * primary-source brochure it cites (vendored at `static/sources/`). `raschpetzer-shafts.ts`
 * covers P-5A/P-7A briefly in its shaft inventory, and `raschpetzer-gallery.ts` mentions
 * "the auxiliary dry channel" in passing (its "Auxiliary channel" section) — this article is
 * where that channel and its two shafts get their own standalone treatment. Every specific
 * fact/number carries its own adjacent citation. Page locators come from `data/shafts.json`'s
 * per-field `_prov.loc` entries, `data/gallery.json`'s `gallery.auxiliaryChannel._prov`, and
 * `docs/RASCHPETZER_DATA.md`'s "Shaft notes" / "Gallery & channel" sections.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.loc` fields,
// data/gallery.json's `gallery.auxiliaryChannel._prov`, and docs/RASCHPETZER_DATA.md's
// "Shaft notes" / "Gallery & channel" sections — plain page/#page anchors into the vendored
// PDF, opened new tab (same pattern as raschpetzer.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	relation: {
		id: 'c-aux-shafts-relation',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 21–22, the auxiliary dry channel)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=21`,
	},
	p5a: {
		id: 'c-aux-shafts-p5a',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 21, shaft P-5A: depth, floor and position)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=21`,
	},
	p7a: {
		id: 'c-aux-shafts-p7a',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 22, fig. 5-14, shaft P-7A drop-shaft technique)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=22`,
	},
	distance: {
		id: 'c-aux-shafts-distance',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 22, P-5 to P-7A distance, ~25 m NW)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=22`,
	},
	dates: {
		id: 'c-aux-shafts-dates',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 12, fig. 3-1, western continuation, 1992–2000 excavation campaign)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=12`,
	},
} satisfies Record<string, Citation>

export const auxiliaryShaftsCitations = c

export const auxiliaryShaftsArticle: Article = {
	id: 'a-auxiliary-shafts',
	slug: 'auxiliary-shafts',
	locale: 'en',
	title: 'The Auxiliary Shafts (P-5A and P-7A)',
	summary:
		"P-5A and P-7A are two shafts west of the main Raschpëtzer qanat line that reach a separate, higher, dry channel — never connected to the aquiferous main conduit — with P-7A additionally notable for its debris-filled drop-shaft excavation technique.",
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Two shafts on the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					" qanat's western leg, ",
				),
				b('P-5A'),
				t(' and '),
				b('P-7A'),
				t(', stand apart from the other sixteen entries in the '),
				link('shaft inventory', 'raschpetzer-shafts'),
				cite(
					': they reach not the main aquiferous conduit but a second, separate channel that runs higher and stayed dry, because it was never connected to the primary water-carrying channel',
					'c-aux-shafts-relation',
				),
				t(
					'. The main article on the ',
				),
				link('gallery and channel', 'raschpetzer-gallery'),
				t(
					' mentions this auxiliary channel briefly; this article covers it and its two shafts in full.',
				),
			),
		},
		{ id: 'h-what', type: 'heading', level: 2, text: 'What is an "auxiliary" channel?' },
		{
			id: 'p-what',
			type: 'paragraph',
			runs: p(
				t(
					'At the Raschpëtzer, "auxiliary" describes a channel that is structurally and hydraulically independent of the main qanat: it was cut at its own gradient, reached by its own shafts, and — critically — never physically joined to the conduit that actually carried spring water to the Roman settlement below.',
				),
				cite(
					' P-5A and P-7A are the two shafts that reach this auxiliary channel',
					'c-aux-shafts-relation',
				),
				t(
					', sitting north of and above the main line rather than along it.',
				),
			),
		},
		{
			id: 'tbl-aux',
			type: 'table',
			headers: ['Shaft', 'Depth (m)', 'Floor elevation (m a.s.l.)', 'Position', 'Notes'],
			rows: [
				['P-5A', '8', '357.5', '~30 m N of P-4', 'Dry channel, 2 m above the main channel; dug in marl, sand-filled'],
				['P-7A', '6', '354.3', '~25 m NW of P-5', 'Debris-filled drop-shaft; restored to original state'],
			],
		},
		{ id: 'h-why', type: 'heading', level: 2, text: 'Why a separate, unconnected system?' },
		{
			id: 'p-why',
			type: 'paragraph',
			runs: p(
				t(
					'The engineering logic follows directly from the elevations: ',
				),
				cite(
					"P-5A's dry channel floor sits about 2 metres higher than the main channel it runs alongside",
					'c-aux-shafts-p5a',
				),
				t(
					' — even if a builder had wanted to tie the two together, gravity alone would have kept the auxiliary channel dry, since water in the main conduit could never rise to meet it. That elevation mismatch is the strongest evidence that the auxiliary branch and the main qanat were never a single connected hydraulic system.',
				),
			),
		},
		{
			id: 'p-why-2',
			type: 'paragraph',
			runs: p(
				t(
					'What the auxiliary branch represents is necessarily somewhat inferential, since the brochure documents its physical relationship to the main line without recording its builders\' intent. A separate, higher channel reached by its own shafts is consistent with an earlier survey or exploratory heading — a branch driven west from the main workings before the final, lower route to the Alzette valley was fixed, then left in place once superseded rather than backfilled and erased. It is also consistent with a short-lived side gallery serving a purpose distinct from bulk water transport. Either way, the shafts were ',
				),
				cite(
					'excavated during the same 1992–2000 western-continuation campaign that opened up the rest of the western leg',
					'c-aux-shafts-dates',
				),
				t(
					', so the auxiliary branch is not a later addition tacked onto an already-finished qanat — it belongs to the same phase of work, just not to the same channel.',
				),
			),
		},
		{ id: 'h-p5a', type: 'heading', level: 2, text: 'P-5A' },
		{
			id: 'p-p5a',
			type: 'paragraph',
			runs: p(
				b('P-5A'),
				cite(
					' is 8 metres deep, with a floor at 357.5 metres above sea level, sunk roughly 30 metres north of shaft P-4',
					'c-aux-shafts-p5a',
				),
				t(' on the main line (see '),
				link('P-4', 'raschpetzer-shafts'),
				t(
					" in the shaft inventory for that shaft's own dry-stone lining and overflow weir). ",
				),
				cite(
					'It was dug through marl and is today sand-filled',
					'c-aux-shafts-p5a',
				),
				t(
					', and its channel — dry, since it was never connected to the main conduit — sits about 2 metres above the aquiferous channel at this point on the route.',
				),
			),
		},
		{ id: 'h-p7a', type: 'heading', level: 2, text: 'P-7A' },
		{
			id: 'p-p7a',
			type: 'paragraph',
			runs: p(
				b('P-7A'),
				cite(
					' is 6 metres deep, with a floor at 354.3 metres above sea level',
					'c-aux-shafts-p7a',
				),
				cite(
					', located roughly 25 metres northwest of shaft P-5',
					'c-aux-shafts-distance',
				),
				t(' — the deepest shaft on the main line (see '),
				link('P5', 'raschpetzer-shafts'),
				t(
					" in the shaft inventory). Of the two auxiliary shafts, P-7A is the westernmost and lowest point on the entire Raschpëtzer shaft record, and it is also the one excavated using a distinct technique, described below.",
				),
			),
		},
		{
			id: 'h-dropshaft',
			type: 'heading',
			level: 2,
			text: 'The drop-shaft debris-fill technique at P-7A',
		},
		{
			id: 'p-dropshaft',
			type: 'paragraph',
			runs: p(
				t('P-7A was excavated as a '),
				b('debris-filled drop-shaft'),
				cite(
					': rather than being cleared all the way to its floor and left open, rubble backfill was packed into it starting from 3 metres depth and continuing a further 3 metres deeper — that is, filling roughly the lower half of the shaft, from mid-depth down to its 6-metre floor',
					'c-aux-shafts-p7a',
				),
				t(
					'. A drop shaft of this kind functioned as a working or exploratory access point during construction rather than as a shaft meant to stay open and lined for the long term; once its purpose was served, backfilling the lower section with excavated rubble was the practical way to stabilize it rather than leave a deep unsupported void.',
				),
			),
		},
		{
			id: 'p-dropshaft-2',
			type: 'paragraph',
			runs: p(
				cite(
					'After excavation and recording, P-7A was restored to its original, backfilled state, and it has no surface cover today',
					'c-aux-shafts-p7a',
				),
				t(
					' — unlike the ten main-line shafts that remain accessible at the surface under modern metal lids. That makes P-7A, and the auxiliary branch it belongs to, a part of the Raschpëtzer that was documented in detail during excavation but was deliberately left non-visitable afterward, in contrast to the ',
				),
				link('main qanat', 'raschpetzer-qanat'),
				t("'s surface-accessible shafts."),
			),
		},
	],
	citations: [c.relation, c.p5a, c.p7a, c.distance, c.dates],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft from the site SSOT dataset (data/shafts.json, data/gallery.json) and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
