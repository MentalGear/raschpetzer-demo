/**
 * Real content: the geology and hydrology of the Pëtschend plateau, the ground the
 * Raschpëtzer qanat is cut through. Sourced from the companion data repo
 * `raschpetzer-model-digital-3d` (`data/geology.json`, `data/hydrology.json`,
 * `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it cites (vendored at
 * `static/sources/`). Every specific fact/number carries its own adjacent citation (not
 * just one somewhere in the paragraph) — see the per-clause `cite()` calls below. Every
 * citation that has a real URL/page locator is deep-linked (`Citation.url`, opened in a
 * new tab by `ArticleReader`'s references list) — see `c.*`'s `#page=N` fragments.
 *
 * Kept as a sibling of `raschpetzer.ts` rather than a section within it: this is a
 * separate `Article` (own id/slug), cross-linked back via `link('Raschpëtzer',
 * 'raschpetzer-qanat')` in the intro paragraph below.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./mock, nor from ./raschpetzer) so this module has no circular
// dependency; mock.ts is the one that imports articles FROM here to append to its
// exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto`
 *  targets are (see `$lib/paths`'s `href`) — a `<img src>`/citation `url` literal needs
 *  the GitHub Pages project-subpath base prefixed by hand, or it 404s under a non-root
 *  `BASE_PATH` deploy (works locally where `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`

// Page locators per data/geology.json's / data/hydrology.json's `_prov` maps and
// data/sources.json (`fig-4-2`/`fig-4-3` both `loc: "fig.4-2/4-3, p.15"`) in the
// raschpetzer-model-digital-3d repo — kept as plain page/#page anchors (not a search/
// highlight viewer): opens the vendored PDF directly at the cited page, new tab.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	structure: {
		id: 'c-geology-structure',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 14, fig. 4-3 — the Pëtschend horst and strata dip)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=14`,
	},
	strata: {
		id: 'c-geology-strata',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 15, fig. 4-2/4-3 — stratigraphy of the Pëtschend)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=15`,
	},
	aquifer: {
		id: 'c-geology-aquifer',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, the Luxembourg sandstone aquifer)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	flow: {
		id: 'c-geology-flow',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 4; p. 29 — average discharge)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=29`,
	},
	historicalFlow: {
		id: 'c-geology-historical-flow',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 29, historical discharge estimated from the sinter line)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=29`,
	},
	deviation: {
		id: 'c-geology-deviation',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 30, P-4 overflow deviation & seepage loss)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=30`,
	},
	springInflux: {
		id: 'c-geology-spring-influx',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 28, spring influx near shaft P8)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=28`,
	},
	chemistry: {
		id: 'c-geology-chemistry',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 30, table 6-1 — water chemistry)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=30`,
	},
	catchment: {
		id: 'c-geology-catchment',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — catchment springs)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
} satisfies Record<string, Citation>

export const geologyCitations = c

export const geologyArticle: Article = {
	id: 'a-raschpetzer-geology',
	slug: 'raschpetzer-geology',
	locale: 'en',
	title: 'Geology and Hydrology of the Pëtschend',
	summary:
		'The Raschpëtzer qanat is cut through the layered sandstones and marls of the Pëtschend, a fault-bounded horst northeast of Walferdange, Luxembourg. Its builders exploited the boundary between the Luxembourg sandstone aquifer and the marl beneath it, where groundwater collects and still feeds the gallery today.',
	categories: ['archaeology'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 2,
		alt: 'Labelled west–east geological cross-section through the Pëtschend plateau and Haedchen depression, showing shafts P-1 to P9, the scree/weathered-rock cover, Luxembourg sandstone, sandstone-marl-limestone strata, the water table, and flow arrows for underground flow and flow in the qanat',
		caption:
			'Simplified geological cross-section through the catchment area: strata dip gently southeast; groundwater collects on the sandstone/marl boundary and drains east, down-dip, toward shaft P9. The qanat gallery cuts against that natural drainage to carry the collected water west, down to the Alzette valley.',
		credit: 'Faber, Waringo & Werner, 2018',
		src: asset('/img/raschpetzer/geo-section-brochure.webp'),
		ratio: 1200 / 617,
	},
	infobox: [
		{ label: 'Structure', value: 'Pëtschend horst, bounded N & S by E–W faults' },
		{ label: 'Strata dip', value: '≈ 2% toward the southeast' },
		{ label: 'Aquifer', value: 'Luxembourg sandstone (Lias), 30–80 m thick' },
		{ label: 'Groundwater accumulates at', value: 'sandstone / marl interface' },
		{ label: 'Groundwater flow direction', value: 'east, down-dip, to the mother shaft' },
		{ label: 'Current average flow', value: '≈ 180 m³/day (formerly ≈ 250 m³/day, est.)' },
		{ label: 'Water hardness', value: '23.4 °fH' },
		{ label: 'Conductivity', value: '478 µS/cm' },
		{ label: 'pH', value: '7.8' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' qanat is cut into the '),
				b('Pëtschend'),
				t(', a plateau northeast of Walferdange whose bedrock forms a central '),
				cite(
					'horst — a raised block bounded north and south by roughly east–west faults, along which strata are re-aligned near-vertically',
					'c-geology-structure',
				),
				t(
					'. Away from the faults, the same strata are gently tilted, and it is that tilt, together with the layering beneath the plateau, that determined both where groundwater collects and how the Roman builders had to route the gallery.',
				),
			),
		},
		{ id: 'h-strata', type: 'heading', level: 2, text: 'Stratigraphy of the Pëtschend' },
		{
			id: 'p-strata',
			type: 'paragraph',
			runs: p(
				cite(
					'The beds under the plateau dip at roughly 2% toward the southeast',
					'c-geology-structure',
				),
				cite(
					', and are arranged, top to bottom, into five documented layers: a shallow cover over a sandstone aquifer, an aquitard of marl and limestone, and impermeable Keuper mudstone and dolomitic marl beneath',
					'c-geology-strata',
				),
				t('.'),
				cite(
					' The Luxembourg sandstone bed is the country’s main aquifer',
					'c-geology-aquifer',
				),
				t(
					' — it is this permeable layer, sitting directly on the aquitard below it, that the qanat was built to intercept.',
				),
			),
		},
		{
			id: 'tbl-strata',
			type: 'table',
			headers: ['Layer', 'Role', 'Thickness'],
			rows: [
				['Weathered rock / soft ground (cover)', 'Cover', '2–10 m'],
				['Luxembourg sandstone (Lias, li2)', 'Aquifer (permeable)', '30–80 m'],
				[
					'Sandy marl, marl & limestone beds (Lias, li1)',
					'Aquitard',
					'≈ 50 m (with li2, at the horst crest)',
				],
				['Mudstone & grey conglomeratic sandstone (Keuper, ko)', 'Impermeable', '≈ 5 m'],
				[
					'Dolomitic marl & fine dolomite beds (Keuper, km3)',
					'Impermeable',
					'≥ 44 m (base below section)',
				],
			],
		},
		{ id: 'h-structure', type: 'heading', level: 2, text: 'Structure: the Pëtschend horst' },
		{
			id: 'p-structure',
			type: 'paragraph',
			runs: p(
				cite(
					'The Pëtschend is a central horst bounded north and south by east–west-trending faults, where the strata are re-aligned to a near-vertical dip',
					'c-geology-structure',
				),
				t(
					'; away from those faults the beds keep their gentle regional southeastward tilt described above. Some groundwater escapes along the fault zones themselves, feeding the ',
				),
				b('Dauvebur'),
				t(' spring to the north and the '),
				b('Op der Rëll'),
				t(' spring to the south, outside the qanat’s own catchment.'),
			),
		},
		{ id: 'h-hydrology', type: 'heading', level: 2, text: 'Groundwater and hydrology' },
		{
			id: 'p-hydrology',
			type: 'paragraph',
			runs: p(
				cite(
					'Groundwater accumulates at the sandstone/marl interface',
					'c-geology-aquifer',
				),
				cite(' and flows east, down-dip, toward the mother shaft', 'c-geology-structure'),
				t(
					' — the qanat gallery was cut against that natural drainage, tapping the collected water and carrying it back west, down to the Alzette valley, by gravity. The gallery today carries an average of',
				),
				cite(' roughly 180 cubic metres of water a day', 'c-geology-flow'),
				cite(
					', down from a formerly higher flow of about 250 m³/day inferred from a sinter line above the present water level — a historical figure the source itself flags only as an approximate estimate, not a measurement',
					'c-geology-historical-flow',
				),
				t('. Along the route, an overflow weir at shaft P-4'),
				cite(' diverts roughly 80 m³/day to a lateral channel', 'c-geology-deviation'),
				cite(', around 100 m³/day is lost to seepage', 'c-geology-deviation'),
				cite(
					', and a small spring adds about 25 m³/day back into the gallery just upstream of shaft P8',
					'c-geology-spring-influx',
				),
				t('.'),
			),
		},
		{
			id: 'p-chemistry',
			type: 'paragraph',
			runs: p(
				t('The water itself is '),
				cite(
					'hard and strongly mineralised — hardness 23.4 °fH, conductivity 478 µS/cm, pH 7.8 — of drinking quality, though it is not used as such today',
					'c-geology-chemistry',
				),
				t('.'),
			),
		},
		{ id: 'h-catchment', type: 'heading', level: 2, text: 'Catchment' },
		{
			id: 'p-catchment',
			type: 'paragraph',
			runs: p(
				cite(
					'The Raschpëtzer qanat sits within a wider catchment of springs draining the Pëtschend plateau and the neighbouring Haedchen depression',
					'c-geology-catchment',
				),
				t(
					', of which the qanat’s own ≈ 180 m³/day is the second-largest single source after the much larger Heisdorf spring further down the valley.',
				),
			),
		},
		{
			id: 'tbl-catchment',
			type: 'table',
			headers: ['Spring', 'Flow (m³/day)'],
			rows: [
				['Geierbierg spring', '80'],
				['Op der Rëll spring', '220'],
				['Dauvebur spring', '20'],
				['Raschpëtzer qanat', '180'],
				['Heisdorf spring', '800'],
			],
		},
	],
	citations: [
		c.structure,
		c.strata,
		c.aquifer,
		c.flow,
		c.historicalFlow,
		c.deviation,
		c.springInflux,
		c.chemistry,
		c.catchment,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft from the site SSOT geology/hydrology dataset and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
