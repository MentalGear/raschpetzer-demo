/**
 * Real content: the three postulated-but-unexcavated shafts of the Raschpëtzer qanat
 * (Walferdange, Luxembourg) — P-2, P-3, and P-6A. A standalone companion sub-article to
 * `./raschpetzer.ts` and `./raschpetzer-shafts.ts` (which covers them only briefly in its
 * shaft table) — see `raschpetzer.ts`'s header for the source repo
 * (`raschpetzer-model-digital-3d`: `data/shafts.json`, `docs/RASCHPETZER_DATA.md`,
 * paradata entry `pd-postulated-shafts`) and the primary-source brochure it cites (vendored
 * at `static/sources/`). Every specific fact/number carries its own adjacent citation — see
 * the per-clause `cite()` calls below, all pointing at brochure p.21 or p.22 per
 * `data/shafts.json`'s `_prov.notes.loc` / `_prov.dates.loc` for P-2, P-3, P-6A.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/raschpetzer-shafts.ts's tiny inline-run authoring
// helpers — kept separate (not imported from either) so this module has no circular
// dependency on them.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.notes.loc` /
// `_prov.dates.loc` for P-2, P-3, P-6A, and docs/RASCHPETZER_DATA.md's paradata entry
// "pd-postulated-shafts" (Brochure 2018, p.21-22) — plain page/#page anchors into the
// vendored PDF, opened new tab (same pattern as raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	spacingMethod: {
		id: 'c-postulated-p21-method',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 21 — inferring unlocated shafts from spacing regularity)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=21`,
	},
	p2p3: {
		id: 'c-postulated-p21-p2p3',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 21 — postulated shafts P-2 and P-3, west of P-4)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=21`,
	},
	p6a: {
		id: 'c-postulated-p22-p6a',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 22, fig. 5-14 — postulated shaft P-6A, auxiliary channel)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=22`,
	},
	notExcavated: {
		id: 'c-postulated-p21-status',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 21 — status: hypothetical, schematic position)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=21`,
	},
} satisfies Record<string, Citation>

export const postulatedShaftsCitations = c

export const postulatedShaftsArticle: Article = {
	id: 'a-postulated-shafts',
	slug: 'postulated-shafts',
	locale: 'en',
	title: 'The Postulated Shafts',
	summary:
		"Three shaft positions along the Raschpëtzer qanat's route — P-2, P-3, and P-6A — have never been excavated or surveyed. Their existence is inferred purely from the regular spacing of the shafts that have been found, a standard qanat-archaeology reasoning method, not from any physical trace at the sites themselves.",
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Not every shaft along the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t("'s route has been located. Three positions — "),
				b('P-2'),
				t(', '),
				b('P-3'),
				t(', and '),
				b('P-6A'),
				t(' — appear in the site record only as '),
				b('postulated'),
				cite(
					': their existence is inferred from the regular inter-shaft spacing of the shafts that have actually been found, not from excavation, survey, or any physical trace at their expected locations.',
					'c-postulated-p21-status',
				),
				t(
					' All three remain unexcavated, and their mapped positions are explicitly hypothetical and schematic.',
				),
			),
		},
		{ id: 'h-method', type: 'heading', level: 2, text: 'A method, not a discovery' },
		{
			id: 'p-method',
			type: 'paragraph',
			runs: p(
				t(
					'Postulating a shaft is an inference, not a find. When a run of shafts along a qanat route has been physically excavated and their positions are known, the intervals between them are not random: ',
				),
				cite(
					'in qanats, shaft spacing often tracks shaft depth',
					'c-postulated-p21-method',
				),
				t(
					' — the deeper the gallery sits below the ground surface at a given point, the more spoil has to be hauled up a given shaft during construction, so builders tended to set successive shaft mouths at intervals that kept the depth, and therefore the excavation and haulage effort, per shaft broadly consistent along a stretch of route. Because the gallery itself follows a very gentle, near-constant gradient while the ground surface above it does not, that depth — and so the spacing — changes in a predictable way as the route crosses flatter or steeper ground.',
				),
			),
		},
		{
			id: 'p-method-2',
			type: 'paragraph',
			runs: p(
				t(
					'That regularity is exactly what lets archaeologists work in the other direction. Where two located, excavated shafts bracket a gap in the sequence, the spacing established by the shafts on either side of the gap can be projected inward to predict where a missing shaft ought to sit — and, by extension, that one probably exists there at all, even though nothing has been dug up to confirm it. This is the reasoning behind P-2, P-3, and P-6A: each is a prediction from the pattern of its excavated neighbours, not a report of something seen or recovered.',
				),
			),
		},
		{ id: 'h-p2-p3', type: 'heading', level: 2, text: 'P-2 and P-3' },
		{
			id: 'p-p2-p3',
			type: 'paragraph',
			runs: p(
				b('P-2'),
				t(' and '),
				b('P-3'),
				cite(
					' are both expected west of shaft P-4, inferred from the spacing regularity among the shafts already located on that stretch of the route',
					'c-postulated-p21-p2p3',
				),
				t(
					'. Neither has been opened or surveyed, and neither has produced any surface trace — no depression, no backfill scar, nothing that excavators have been able to point to on the ground. Their positions exist only as schematic markers on the site plan, placed where the spacing pattern says a shaft should be, pending fieldwork that could confirm or overturn the prediction.',
				),
			),
		},
		{ id: 'h-p6a', type: 'heading', level: 2, text: 'P-6A' },
		{
			id: 'p-p6a',
			type: 'paragraph',
			runs: p(
				b('P-6A'),
				cite(
					' is inferred the same way, but from a different pair of neighbours: the spacing between the auxiliary shafts P-5A and P-7A',
					'c-postulated-p22-p6a',
				),
				t(', both described in the '),
				link('shaft inventory', 'raschpetzer-shafts'),
				t(
					', on the separate, higher, dry channel that runs roughly 30 metres north of the main gallery and was never connected to it. Because that auxiliary branch has its own excavated endpoints but no confirmed shaft between them, P-6A is postulated to fill the same kind of gap on that shorter, separate line that P-2 and P-3 fill on the main route.',
				),
			),
		},
		{
			id: 'h-hypothesis',
			type: 'heading',
			level: 2,
			text: 'A hypothesis, not a confirmed find',
		},
		{
			id: 'p-hypothesis',
			type: 'paragraph',
			runs: p(
				t(
					'It is worth being plain about what this status does and does not mean. P-2, P-3, and P-6A are recorded with existence ',
				),
				b('inferred'),
				t(' and position '),
				b('hypothetical'),
				cite(
					', on the strength of a spacing pattern that has held for the shafts actually excavated nearby — a reasonable working hypothesis, and a standard one in qanat archaeology, but a hypothesis all the same.',
					'c-postulated-p21-status',
				),
				t(
					' Nothing has been dug at any of the three locations, so there is no direct evidence — no shaft lining, no backfill, no artifact — that any of them actually exists where predicted, or exists at all. The three remain open questions for future fieldwork at the ',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' site, not settled entries in its shaft count.'),
			),
		},
	],
	citations: [c.spacingMethod, c.p2p3, c.p6a, c.notExcavated],
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
