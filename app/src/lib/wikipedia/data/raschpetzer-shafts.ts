/**
 * Real content: the 18 known/postulated vertical access shafts of the Raschpëtzer qanat
 * (Walferdange, Luxembourg). A companion sub-article to `./raschpetzer.ts` — see that file's
 * header for the source repo (`raschpetzer-model-digital-3d`: `data/shafts.json`,
 * `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it cites (vendored at
 * `static/sources/`). Every specific fact/number carries its own adjacent citation. Page
 * locators come from `data/shafts.json`'s per-field `_prov.loc` entries.
 */
import { base } from '$app/paths'
import type { Article, Citation, GalleryItemRef, Inline, TextRun } from './types'

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
/** Build a `srcset` attribute string from `[path, widthDescriptor]` pairs, base-prefixed. */
const srcsetOf = (entries: [string, string][]): string =>
	entries.map(([path, w]) => `${asset(path)} ${w}`).join(', ')

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.loc` fields /
// docs/RASCHPETZER_DATA.md's "Shaft notes" — plain page/#page anchors into the vendored PDF,
// opened new tab (same pattern as raschpetzer.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	overview: {
		id: 'c-shafts-p4',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 4, shaft count and depth range)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=4`,
	},
	p5depth: {
		id: 'c-shafts-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, fig. 6-7 — shaft P5 depth)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	p5cleared: {
		id: 'c-shafts-p11',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, 11–12 — P5 cleared to base, 3 Oct 1986)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=11`,
	},
	p5diameter: {
		id: 'c-shafts-p18',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, 18 — shaft P5 diameter and torus bulges)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=18`,
	},
	geologicalAccident: {
		id: 'c-shafts-p23',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20–21, 23 — the "geological accident" at shaft P-5)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	p9mother: {
		id: 'c-shafts-p10',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10, 19 — shaft P9, the "mother shaft")',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	p8dating: {
		id: 'c-shafts-p29',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 28–29 — oak beam near shaft P8)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=28`,
	},
	p4lining: {
		id: 'c-shafts-p20',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20, fig. 5-11 — shaft P-4 lining and overflow weir)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	p4diameter: {
		id: 'c-shafts-p31',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 31 — shaft P-4 base diameter)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=31`,
	},
	postulatedWest: {
		id: 'c-shafts-p21',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 21 — postulated shafts P-2, P-3)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=21`,
	},
	postulatedP6A: {
		id: 'c-shafts-p22',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 22, fig. 5-14 — postulated shaft P-6A; auxiliary drop-shaft P-7A)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=22`,
	},
	more1: {
		id: 'c-shafts-more-1',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20 — dry-stone shaft-lining technique)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	more2: {
		id: 'c-shafts-more-2',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 18 — shaft profile narrowing at torus bulges)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=18`,
	},
	more3: {
		id: 'c-shafts-more-3',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10 — seepage at a shaft base)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	more4: {
		id: 'c-shafts-more-4',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (excavation photographs, ch. 5 — shaft heads along the route)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: BROCHURE_PDF,
	},
	more5: {
		id: 'c-shafts-more-5',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (excavation photographs, ch. 5 — surface viewing points on the visitor trail)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: BROCHURE_PDF,
	},
} satisfies Record<string, Citation>

export const raschpetzerShaftsCitations = c

/** Further excavation photographs (chapter 5 of the brochure) not already used elsewhere in
 *  this article or in `raschpetzer.ts` — picked from the vendored originals for showing a
 *  specific shaft feature or technique described in the prose above. */
const moreExcavationItems: GalleryItemRef[] = [
	{
		id: 'more-p4-lining',
		alt: 'Close-up of a dry-stone shaft lining: courses of squared sandstone blocks stacked against the shaft wall, with water emerging at the base',
		caption:
			"Dry-stone lining technique: courses of squared blocks stacked to face the shaft wall, water emerging at the base — the same construction used for shaft P-4's lining and overflow weir.",
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 0,
		ratio: 2592 / 1944,
		src: asset('/img/raschpetzer/Fig5-03-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig5-03-480w.webp', '480w'],
			['/img/raschpetzer/Fig5-03-960w.webp', '960w'],
			['/img/raschpetzer/Fig5-03-1920w.webp', '1920w'],
		]),
		sizes: '(min-width: 768px) 640px, 100vw',
	},
	{
		id: 'more-p5-profile',
		alt: 'View down a shaft showing its walls narrowing in a series of stepped rings as the shaft descends',
		caption:
			'Looking down a shaft: the walls narrow in a series of stepped rings with depth — the torus-bulge profile recorded at shaft P5, where the diameter steps down from 1.2 m to 0.85 m.',
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 1,
		ratio: 800 / 533,
		src: asset('/img/raschpetzer/Fig5-07-fallback.jpg'),
		srcset: srcsetOf([['/img/raschpetzer/Fig5-07-480w.webp', '480w']]),
		sizes: '(min-width: 768px) 640px, 100vw',
	},
	{
		id: 'more-p9-base',
		alt: 'View down a shaft to its base, where water pools on the gallery floor beneath a work lamp',
		caption:
			'The base of a shaft, water standing where it meets the gallery floor — the seepage-gutter arrangement recorded at the base of shaft P9.',
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 2,
		ratio: 2592 / 1944,
		src: asset('/img/raschpetzer/Fig5-08-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig5-08-480w.webp', '480w'],
			['/img/raschpetzer/Fig5-08-960w.webp', '960w'],
			['/img/raschpetzer/Fig5-08-1920w.webp', '1920w'],
		]),
		sizes: '(min-width: 768px) 640px, 100vw',
	},
	{
		id: 'more-shaft-heads',
		alt: 'Aerial view of a forest path with a line of round metal shaft-head covers set into the ground alongside it',
		caption:
			'Shaft heads along the route, each capped with a modern protective cover set into the forest floor above the buried gallery.',
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 3,
		ratio: 1318 / 2306,
		src: asset('/img/raschpetzer/Fig5-06-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig5-06-480w.webp', '480w'],
			['/img/raschpetzer/Fig5-06-960w.webp', '960w'],
		]),
		sizes: '(min-width: 768px) 640px, 100vw',
	},
	{
		id: 'more-viewing-point',
		alt: "A railed viewing platform on the visitor trail overlooking a stone-lined section of the qanat's water flowing beneath a footbridge",
		caption:
			"A surface viewing point on the visitor trail, where a stone-lined section of the qanat's water is visible flowing beneath a footbridge.",
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 4,
		ratio: 2468 / 1764,
		src: asset('/img/raschpetzer/Fig5-09-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig5-09-480w.webp', '480w'],
			['/img/raschpetzer/Fig5-09-960w.webp', '960w'],
			['/img/raschpetzer/Fig5-09-1920w.webp', '1920w'],
		]),
		sizes: '(min-width: 768px) 640px, 100vw',
	},
]

export const shafts: Article = {
	id: 'a-raschpetzer-shafts',
	slug: 'raschpetzer-shafts',
	locale: 'en',
	title: 'Shafts of the Raschpëtzer',
	summary:
		"An inventory of the 18 known or postulated vertical access shafts along the Raschpëtzer qanat's route, from the auxiliary drop-shaft P-7A in the west to the 'mother shaft' P9 in the east, with each shaft's depth, floor elevation, and excavation notes.",
	categories: ['archaeology'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 2,
		alt: "Schematic west-to-east profile of the Raschpëtzer shaft line, from auxiliary shaft P-7A to the 'mother shaft' P9, marking explored and unexplored gallery sections and construction work at each shaft head",
		caption:
			"The shaft line from P-7A (west) to P9 (east): explored gallery in black, unexplored in grey, and construction work marked at the shaft heads — including the P-4 lateral channel (a) and the P-5 channel enclosure and visitor's gallery (b).",
		credit: 'Faber, Waringo & Werner, 2018',
		src: asset('/img/raschpetzer/Fig5-04-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig5-04-480w.webp', '480w'],
			['/img/raschpetzer/Fig5-04-960w.webp', '960w'],
			['/img/raschpetzer/Fig5-04-1920w.webp', '1920w'],
		]),
		sizes: '(min-width: 768px) 640px, 100vw',
		ratio: 1920 / 423,
	},
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' gallery is reached by 18 shaft records along its route: '),
				cite(
					'thirteen shafts documented along the main line, ranging 6–36 metres deep,',
					'c-shafts-p4',
				),
				t(
					' two further auxiliary shafts (P-5A, P-7A) on a separate, higher branch that was never connected to the main channel, and three shafts (P-2, P-3, P-6A) whose existence is postulated from shaft-spacing regularity but which have never been located. Shafts are numbered west to east from P-7A to the ',
				),
				b("'mother shaft'"),
				t(' P9.'),
			),
		},
		{
			id: 'table-shafts',
			type: 'table',
			headers: ['Shaft', 'Role', 'Depth (m)', 'Floor elevation (m a.s.l.)', 'Status'],
			rows: [
				['P-7A', 'Auxiliary', '6', '354.3', 'Documented'],
				['P-5A', 'Auxiliary', '8', '357.5', 'Documented'],
				['P-5', 'Main', '—', '—', 'Documented'],
				['P-4', 'Main', '12', '355.4', 'Documented'],
				['P-1', 'Main', '—', '—', 'Documented'],
				['P0', 'Not excavated', '—', '—', 'Documented'],
				['P1', 'Main', '30', '—', 'Documented'],
				['P2', 'Main', '—', '—', 'Documented'],
				['P3', 'Main', '35', '—', 'Documented'],
				['P4', 'Main', '—', '—', 'Documented'],
				['P5', 'Main', '36', '—', 'Documented'],
				['P6', 'Main', '—', '—', 'Documented'],
				['P7', 'Main', '—', '—', 'Documented'],
				['P8', 'Main', '—', '—', 'Documented'],
				['P9', 'Mother shaft', '—', '—', 'Documented'],
				['P-2', 'Postulated', '—', '—', 'Inferred, not located'],
				['P-3', 'Postulated', '—', '—', 'Inferred, not located'],
				['P-6A', 'Postulated', '—', '—', 'Inferred, not located'],
			],
		},
		{ id: 'h-p5', type: 'heading', level: 2, text: 'P5 — the deepest shaft' },
		{
			id: 'p-p5',
			type: 'paragraph',
			runs: p(
				b('P5'),
				t(', at the eastern edge of the Pëtschend plateau, is '),
				cite('the deepest shaft on the route at 36 metres', 'c-shafts-p9'),
				cite(
					' — its diameter narrows from 1.2 m to 0.85 m at a series of torus bulges as it descends, and the gallery passes tangentially to the shaft rather than crossing it',
					'c-shafts-p18',
				),
				t('. Cleared to roughly 10 m in 1913, its base was not reached until '),
				cite(
					'3 October 1986, the day the qanat gallery itself was rediscovered',
					'c-shafts-p11',
				),
				t('. West of here, at the neighbouring shaft P-5, excavators recorded a '),
				cite(
					"'geological accident': the channel floor was breached and water was lost into limestone fissures, forcing that stretch of channel to be rebuilt in concrete",
					'c-shafts-p23',
				),
				t('.'),
			),
		},
		{ id: 'h-p9', type: 'heading', level: 2, text: 'P9 — the mother shaft' },
		{
			id: 'p-p9',
			type: 'paragraph',
			runs: p(
				b('P9'),
				cite(
					" is the most upstream and easternmost shaft on the route — the qanat's 'mother shaft'.",
					'c-shafts-p10',
				),
				cite(
					' The excavated gallery continues only about 6 m further east before ending, with no channel cut for its final 13 m; at its base a portal niche with a seepage gutter was found, and oak shovels likely used to dig the gallery were recovered from the surrounding mud',
					'c-shafts-p10',
				),
				t(' (see the finds gallery in the main article).'),
			),
		},
		{ id: 'h-p8', type: 'heading', level: 2, text: 'P8 — the dated shaft' },
		{
			id: 'p-p8',
			type: 'paragraph',
			runs: p(
				cite(
					'An oak beam recovered near the base of shaft P8 gave an outer growth ring dated to AD 114, extrapolated to a felling date around AD 131',
					'c-shafts-p29',
				),
				t(" — the find used to date the qanat's construction; see the "),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					" article's Dating section for the dendrochronology itself. A spring inflow of roughly 25 m³ a day enters the gallery about 2 m upstream of P8.",
				),
			),
		},
		{
			id: 'h-p4',
			type: 'heading',
			level: 2,
			text: 'P-4 — dry-stone lining and the overflow weir',
		},
		{
			id: 'p-p4',
			type: 'paragraph',
			runs: p(
				b('P-4'),
				t(', roughly halfway along the western leg of the route, is '),
				cite(
					'dry-stone lined with a 0.8 m wall built up in three concentric rows',
					'c-shafts-p20',
				),
				cite(', its base widening to a 1.4 m cone,', 'c-shafts-p31'),
				cite(
					' and fitted with an overflow weir that diverts water into a lateral channel whenever the level in the main channel exceeds about 12 cm',
					'c-shafts-p20',
				),
				t('. A windowed cover today lets visitors see the bifurcation from the surface.'),
			),
		},
		{
			id: 'h-postulated',
			type: 'heading',
			level: 2,
			text: 'Postulated shafts: P-2, P-3, P-6A',
		},
		{
			id: 'p-postulated',
			type: 'paragraph',
			runs: p(
				t('Three further shaft positions have never been located or excavated: '),
				cite(
					'P-2 and P-3, expected west of P-4, are inferred from the regular spacing of the shafts that have been found',
					'c-shafts-p21',
				),
				t(' — in qanats, shaft spacing often tracks shaft depth — and '),
				cite(
					'P-6A is similarly inferred from the spacing between the auxiliary shafts P-5A and P-7A',
					'c-shafts-p22',
				),
				t(
					'. All three remain marked only as hypothetical, schematic positions pending further fieldwork.',
				),
			),
		},
		{ id: 'h-gallery-more', type: 'heading', level: 2, text: 'Further excavation photographs' },
		{
			id: 'p-gallery-more',
			type: 'paragraph',
			runs: p(
				t('Further photographs from the site put these features in context: '),
				cite(
					"the qanat's dry-stone shaft lining, laid in courses of squared blocks",
					'c-shafts-more-1',
				),
				t(', '),
				cite('the stepped, narrowing profile of a shaft as it descends', 'c-shafts-more-2'),
				t(', and '),
				cite(
					'the standing water typical of a shaft base where it meets the gallery floor',
					'c-shafts-more-3',
				),
				t('. Above ground, '),
				cite(
					'each shaft is capped with a modern protective cover set into the forest floor',
					'c-shafts-more-4',
				),
				t(', and '),
				cite(
					"a handful of surface viewing points along the trail let visitors see the qanat's water without entering the gallery",
					'c-shafts-more-5',
				),
				t('.'),
			),
		},
		{ id: 'gal-more', type: 'gallery', items: moreExcavationItems },
	],
	citations: [
		c.overview,
		c.p5depth,
		c.p5cleared,
		c.p5diameter,
		c.geologicalAccident,
		c.p9mother,
		c.p8dating,
		c.p4lining,
		c.p4diameter,
		c.postulatedWest,
		c.postulatedP6A,
		c.more1,
		c.more2,
		c.more3,
		c.more4,
		c.more5,
	],
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
