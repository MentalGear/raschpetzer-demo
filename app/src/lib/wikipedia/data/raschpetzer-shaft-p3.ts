/**
 * Real content: a standalone deep-dive on shaft P3 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg) — a companion sub-article to `./raschpetzer.ts` and `./raschpetzer-shafts.ts`.
 * See `raschpetzer.ts`'s header for the source repo (`raschpetzer-model-digital-3d`:
 * `data/shafts.json`'s "P3" record, `docs/RASCHPETZER_DATA.md`'s shaft notes) and the
 * primary-source brochure it cites (vendored at `static/sources/`). Every specific fact/number
 * carries its own adjacent citation. Page locators come from `data/shafts.json`'s `_prov.loc`
 * fields for P3 (all p.17).
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/raschpetzer-shafts.ts's tiny inline-run authoring helpers —
// kept separate (not imported from either) so this module has no circular dependency on them.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.loc` fields for the
// "P3" record / docs/RASCHPETZER_DATA.md's "Shaft notes" — plain page/#page anchors into the
// vendored PDF, opened new tab (same pattern as raschpetzer.ts's `c`). All P3 facts trace to
// brochure p.17, so every citation below points there; only the fragment/title differs by facet.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	depth: {
		id: 'c-shaft-p3-depth',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17, shaft P3 depth)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	alignment: {
		id: 'c-shaft-p3-alignment',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17, P3 on the P1–P5 line, 28 m from P2)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	routeChoice: {
		id: 'c-shaft-p3-route-choice',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17, plateau narrowest point / minimising >30 m shafts)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	backfilled: {
		id: 'c-shaft-p3-backfilled',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17, P3 still in original state)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	p1depth: {
		id: 'c-shaft-p3-p1-depth',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 16, shaft P1 depth)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=16`,
	},
	p5depth: {
		id: 'c-shaft-p3-p5-depth',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, fig. 6-7 — shaft P5 depth)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	overview: {
		id: 'c-shaft-p3-overview',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 4, shaft count and depth range)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=4`,
	},
} satisfies Record<string, Citation>

export const shaftP3Citations = c

export const shaftP3Article: Article = {
	id: 'a-shaft-p3',
	slug: 'shaft-p3',
	locale: 'en',
	title: 'Shaft P3',
	summary:
		'A deep-dive on shaft P3 of the Raschpëtzer qanat: a 35-metre shaft sunk exactly on the P1–P5 alignment where the route crosses the Pëtschend plateau at its narrowest, still in its original backfilled state and unexcavated to this day.',
	categories: ['archaeology'],
	infobox: [
		{ label: 'Route position', value: 'On the main line, between P2 and P4' },
		{ label: 'Depth', value: '35 m' },
		{ label: 'Alignment', value: 'Exactly on the P1–P5 straight line' },
		{ label: 'Distance from P2', value: '28 m' },
		{ label: 'Surface state', value: 'Backfilled in its original state — no surface cover' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('P3'),
				t(' is one of the thirteen documented shafts of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat, sunk on the eastern, plateau-top stretch of the route between shafts P2 and P4. It sits ',
				),
				cite('35 metres deep', 'c-shaft-p3-depth'),
				t(
					', making it the second-deepest shaft documented along the entire route after P5, and it remains ',
				),
				cite('backfilled in its original state', 'c-shaft-p3-backfilled'),
				t(' — it has never been reopened or fitted with a surface cover.'),
			),
		},
		{ id: 'h-depth', type: 'heading', level: 2, text: 'Depth' },
		{
			id: 'p-depth',
			type: 'paragraph',
			runs: p(
				t('At '),
				cite('35 m', 'c-shaft-p3-depth'),
				t(', P3 is deeper than every other documented shaft on the route except '),
				link('P5', 'shaft-p5'),
				t(', which reaches '),
				cite('36 m at the eastern edge of the plateau', 'c-shaft-p3-p5-depth'),
				t(". Overall, the route's "),
				cite('thirteen known shafts range from 6 to 36 metres deep', 'c-shaft-p3-overview'),
				t(
					', so P3 sits near the top of that range — well past the 30 m mark that, as discussed below, the builders otherwise tried to avoid.',
				),
			),
		},
		{ id: 'h-alignment', type: 'heading', level: 2, text: 'Position on the P1–P5 alignment' },
		{
			id: 'p-alignment',
			type: 'paragraph',
			runs: p(
				cite(
					'P3 lies exactly on the straight line running from shaft P1 to shaft P5',
					'c-shaft-p3-alignment',
				),
				t(', and it is set '),
				cite('28 metres from its western neighbour, P2', 'c-shaft-p3-alignment'),
				t(
					". A qanat gallery has to fall gently and continuously toward its outlet — even a small kink or grade error can pond water or run the channel dry — so keeping a chain of shafts sunk from the surface on a single straight bearing is itself a check on the surveying that produced them: each shaft head has to be set out from a bearing carried across the surface, independent of what the diggers below could see or correct for once underground. That P3's position falls exactly on the line already fixed by P1 and P5, rather than drifting to one side, is a concrete measure of how tightly the Roman surveyors controlled that bearing over this stretch of the plateau.",
				),
			),
		},
		{ id: 'h-route', type: 'heading', level: 2, text: 'Why the route crosses here' },
		{
			id: 'p-route',
			type: 'paragraph',
			runs: p(
				t('The route was carried across the '),
				b('Pëtschend plateau'),
				t(
					' at its narrowest point specifically at P3, and the brochure records this as a deliberate choice: ',
				),
				cite(
					'crossing the plateau at its narrowest was meant to minimise the number of shafts deeper than 30 metres',
					'c-shaft-p3-route-choice',
				),
				t(
					'. A wider crossing elsewhere on the plateau would have meant a longer stretch of gallery running under greater overburden, which would in turn have forced more of the shafts along it past the 30 m mark — each extra metre of shaft meant more spoil to haul to the surface, more risk to the diggers, and more time. Routing through the narrowest point traded a still-considerable 35 m shaft at P3 (and 30 m at ',
				),
				link('P1', 'shaft-p1'),
				cite(', which the brochure separately records at 30 m', 'c-shaft-p3-p1-depth'),
				t(
					") against having to sink even more shafts that deep or deeper across a longer plateau crossing — an engineering trade-off between minimising each individual shaft's depth and minimising how many shafts had to be that deep at all.",
				),
			),
		},
		{ id: 'h-state', type: 'heading', level: 2, text: 'Current state' },
		{
			id: 'p-state',
			type: 'paragraph',
			runs: p(
				t('Unlike the shafts open to visitors along the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' trail, P3 has '),
				cite(
					'never been re-excavated and remains backfilled in its original state',
					'c-shaft-p3-backfilled',
				),
				t(
					', with no surface cover marking it today. Its documented depth and position on the P1–P5 line come from the original excavation records rather than from a shaft that can currently be inspected at the surface. See ',
				),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t(
					' for the full inventory of all eighteen known and postulated shafts along the route.',
				),
			),
		},
	],
	citations: [
		c.depth,
		c.alignment,
		c.routeChoice,
		c.backfilled,
		c.p1depth,
		c.p5depth,
		c.overview,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft from the site SSOT dataset (data/shafts.json, "P3") and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
