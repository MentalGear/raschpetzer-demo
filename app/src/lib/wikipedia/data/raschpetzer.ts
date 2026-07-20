/**
 * Real content: the Raschpëtzer Roman qanat (Walferdange, Luxembourg). Sourced from the
 * companion data repo `raschpetzer-model-digital-3d` (`data/site.json`, `data/shafts.json`,
 * `data/sources.json`, `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it
 * cites (vendored at `static/sources/`), plus external corroborating sources found via web
 * search. Every specific fact/number carries its own adjacent citation (not just one
 * somewhere in the paragraph) — see the per-clause `cite()` calls below. Every citation
 * that has a real URL/page locator is deep-linked (`Citation.url`, opened in a new tab by
 * `ArticleReader`'s references list) — see `c.brochure*`'s `#page=N` fragments.
 */
import { base } from '$app/paths'
import type { Article, Category, Citation, GalleryItemRef, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./mock) so this module has no circular dependency on it; mock.ts is the
// one that imports articles/categories FROM here to append to its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

export const archaeologyCategory: Category = {
	id: 'archaeology',
	label: 'Archaeology',
	description: 'Excavated sites, artifacts, and the methods used to study the human past.',
}

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto`
 *  targets are (see `$lib/paths`'s `href`) — a `<img src>`/citation `url` literal needs
 *  the GitHub Pages project-subpath base prefixed by hand, or it 404s under a non-root
 *  `BASE_PATH` deploy (works locally where `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`
/** Build a `srcset` attribute string from `[path, widthDescriptor]` pairs, base-prefixed. */
const srcsetOf = (entries: [string, string][]): string =>
	entries.map(([path, w]) => `${asset(path)} ${w}`).join(', ')

// Page locators per data/sources.json's `_prov` map / docs/RASCHPETZER_DATA.md in the
// raschpetzer-model-digital-3d repo — kept as plain page/#page anchors (not a search/
// highlight viewer): opens the vendored PDF directly at the cited page, new tab.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	brochureOverview: {
		id: 'c-raschpetzer-brochure-p4',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 4, site facts)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=4`,
	},
	brochureFlow: {
		id: 'c-raschpetzer-brochure-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, flow direction)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	brochureFinds: {
		id: 'c-raschpetzer-brochure-p10',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10, 19; fig. 5-7 — shaft P9 finds)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	brochureExcavation: {
		id: 'c-raschpetzer-brochure-p11',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 11–13, excavation chronicle)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=11`,
	},
	brochureDating: {
		id: 'c-raschpetzer-brochure-p29',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 29, dendrochronology)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=29`,
	},
	wikipediaEn: {
		id: 'c-wikipedia-raschpetzer',
		title: 'Raschpëtzer Qanat',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Raschp%C3%ABtzer_Qanat',
	},
	visitLuxembourg: {
		id: 'c-visitluxembourg-raschpetzer',
		title: 'Gallo-Roman aqueduct Raschpëtzer',
		publisher: 'Visit Luxembourg (official tourism board)',
		url: 'https://www.visitluxembourg.com/place/gallo-roman-site-raschpetzer-walferdange',
	},
	brochureMoreViews: {
		id: 'c-raschpetzer-more-fig2',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (pp. 6–10, excavation photographs)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=8`,
	},
} satisfies Record<string, Citation>

export const raschpetzerCitations = c

/** The two MNHA photos of the oak shovel found near shaft P9 (docs/RASCHPETZER_DATA.md: "a
 *  portal niche with a seepage gutter; oak shovels were found in the mud nearby" — Brochure
 *  2018 p.10, p.19, fig.5-7) — front/back views of the same artifact, a real multi-item
 *  gallery (not two separate single-figure blocks) so it renders through the app's actual
 *  gallery slider + lightbox (GalleryNodeView.svelte), not two static figures. */
const findsGalleryItems: GalleryItemRef[] = [
	{
		id: 'shovel-a',
		alt: 'Wooden shovel found near shaft P9, front view, with a 30 cm scale bar',
		caption: 'Oak shovel recovered from the mud near shaft P9.',
		credit: 'Photo: Tom Lucas & Ben Muller, MNHA, 2022',
		tone: 4,
		ratio: 1920 / 1280,
		src: asset('/img/raschpetzer/a-shovel-P9-FOTO-Tom-Lucas-Ben-Muller-MNHA-2022-fallback.jpg'),
	},
	{
		id: 'shovel-b',
		alt: 'Wooden shovel found near shaft P9, reverse view, with a 30 cm scale bar',
		caption: 'The same shovel, reverse side.',
		credit: 'Photo: Tom Lucas & Ben Muller, MNHA, 2022',
		tone: 4,
		ratio: 1920 / 1280,
		src: asset('/img/raschpetzer/b-shovel-P9-FOTO-Tom-Lucas-Ben-Muller-MNHA-2022-fallback.jpg'),
	},
]

/** Four brochure photographs of the excavation campaigns (fig. 2 series) not otherwise used
 *  in the article — the pre-excavation surface trace of a shaft, fieldwork inside an open
 *  pit, shaft-lining installation, and the hoist used to haul spoil out of the gallery — for
 *  an "Additional views" closing gallery. */
const moreViewsGalleryItems: GalleryItemRef[] = [
	{
		id: 'excav-depression',
		alt: 'Black-and-white photograph of a shallow, leaf-covered depression in the forest floor, marking the surface trace of an unexcavated shaft',
		caption:
			'A shallow depression in the forest floor marks the buried top of a shaft before excavation.',
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 2,
		ratio: 1341 / 891,
		src: asset('/img/raschpetzer/Fig2-02-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig2-02-480w.webp', '480w'],
			['/img/raschpetzer/Fig2-02-960w.webp', '960w'],
		]),
	},
	{
		id: 'excav-pit',
		alt: 'Two people examine the sides of an open excavation pit, autumn leaves scattered across the churned earth',
		caption: 'Archaeologists documenting the walls of an excavated shaft pit during fieldwork.',
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 2,
		ratio: 1920 / 1248,
		src: asset('/img/raschpetzer/Fig2-04-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig2-04-480w.webp', '480w'],
			['/img/raschpetzer/Fig2-04-960w.webp', '960w'],
			['/img/raschpetzer/Fig2-04-1920w.webp', '1920w'],
		]),
	},
	{
		id: 'shaft-lining',
		alt: 'A crane lowers a precast concrete ring into a shored excavation pit in the forest, with stacked rings waiting nearby',
		caption: 'A crane lowers precast concrete rings into place to line and stabilize a shaft.',
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 2,
		ratio: 1020 / 576,
		src: asset('/img/raschpetzer/Fig2-11-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig2-11-480w.webp', '480w'],
			['/img/raschpetzer/Fig2-11-960w.webp', '960w'],
		]),
	},
	{
		id: 'gallery-hoist',
		alt: 'A chain hoist lowers a bucket to haul excavated sediment out through the narrow gallery passage',
		caption:
			'A chain hoist and bucket used to remove spoil from the gallery during excavation.',
		credit: 'Faber, Waringo & Werner, 2018',
		tone: 2,
		ratio: 1920 / 2962,
		src: asset('/img/raschpetzer/Fig2-14-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig2-14-480w.webp', '480w'],
			['/img/raschpetzer/Fig2-14-960w.webp', '960w'],
			['/img/raschpetzer/Fig2-14-1920w.webp', '1920w'],
		]),
	},
]

export const raschpetzer: Article = {
	id: 'a-raschpetzer',
	slug: 'raschpetzer-qanat',
	locale: 'en',
	title: 'Raschpëtzer Qanat',
	summary:
		'The Raschpëtzer is a Roman-era qanat (underground water-supply gallery) in Helmsange Forest, Walferdange, Luxembourg — a 720 m gravity-fed conduit reached through more than a dozen vertical shafts, built to carry spring water from the Pëtschend plateau down to a Roman settlement in the Alzette valley.',
	categories: ['archaeology', 'history'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 3,
		alt: 'Map showing the location of the Raschpëtzer site near Walferdange, Luxembourg, within the Alzette valley',
		caption:
			'The Raschpëtzer qanat (site 3) lies in the Alzette valley near Walferdange, Grand Duchy of Luxembourg.',
		credit: 'Faber, Waringo & Werner, 2018',
		src: asset('/img/raschpetzer/Fig1-01-fallback.jpg'),
		srcset: srcsetOf([
			['/img/raschpetzer/Fig1-01-480w.webp', '480w'],
			['/img/raschpetzer/Fig1-01-960w.webp', '960w'],
			['/img/raschpetzer/Fig1-01-1920w.webp', '1920w'],
		]),
		sizes: '(min-width: 768px) 640px, 100vw',
		ratio: 3676 / 2462,
	},
	infobox: [
		{ label: 'Type', value: 'Roman qanat (underground water-supply gallery)' },
		{ label: 'Location', value: 'Helmsange Forest, Walferdange, Luxembourg' },
		{ label: 'Coordinates', value: '49.668° N, 6.139° E' },
		{ label: 'Channel length', value: '720 m (310 m explored)' },
		{ label: 'Known shafts', value: '13 (depths 6–36 m)' },
		{ label: 'Service period', value: 'c. AD 131 – AD 350' },
		{ label: 'Average flow', value: '≈ 180 m³ / day' },
		{ label: 'Rediscovered', value: '1986 (excavations resumed 1967)' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				b('Raschpëtzer'),
				t(
					' is a Gallo-Roman qanat — a gently sloping underground gallery fed by a chain of vertical access shafts — cut into the sandstone of the Pëtschend plateau northeast of ',
				),
				link('Helmsange', 'helmsange'),
				t(', in the municipality of '),
				b('Walferdange'),
				t(', Luxembourg.'),
				cite(
					' It carried spring water roughly 720 metres, dropping about 100 metres in elevation,',
					'c-raschpetzer-brochure-p4',
				),
				t(' west toward the Alzette valley to supply a Roman-era settlement.'),
			),
		},
		{ id: 'h-overview', type: 'heading', level: 2, text: 'Construction and layout' },
		{
			id: 'p-shafts',
			type: 'paragraph',
			runs: p(
				cite(
					'Thirteen shafts are currently known along the route, ranging from 6 to 36 metres deep and 0.8–1.2 metres in diameter; the connecting gallery itself is only 0.5–2.0 metres wide and 0.5–2.3 metres high above the stone-covered water conduit at its floor.',
					'c-raschpetzer-brochure-p4',
				),
				cite(' Water flowed east to west', 'c-raschpetzer-brochure-p9'),
				t(
					' — from the springs of the Pëtschend plateau and the Haedchen depression toward the Alzette valley — contrary to the natural dip of the surrounding strata, meaning the gallery had to be surveyed and cut with real precision for',
				),
				cite(
					' an unpowered gravity flow of roughly 180 cubic metres a day.',
					'c-raschpetzer-brochure-p4',
				),
			),
		},
		{
			id: 'fig-catchment',
			type: 'figure',
			tone: 1,
			alt: 'Topographic map of the Pëtschend plateau and Haedchen depression showing the catchment springs and the qanat shaft line',
			caption:
				"Catchment map of the Pëtschend plateau and Haedchen depression: springs A–C feed the qanat's shaft line (marked R), overlaid on the local topography and fault lines.",
			credit: 'Faber, Waringo & Werner, 2018',
			src: asset('/img/raschpetzer/Fig3-01-fallback.jpg'),
			srcset: srcsetOf([
				['/img/raschpetzer/Fig3-01-480w.webp', '480w'],
				['/img/raschpetzer/Fig3-01-960w.webp', '960w'],
			]),
			sizes: '(min-width: 768px) 640px, 100vw',
			ratio: 1461 / 1190,
		},
		{ id: 'h-dating', type: 'heading', level: 2, text: 'Dating' },
		{
			id: 'p-dating',
			type: 'paragraph',
			runs: p(
				cite(
					'An oak beam recovered from shaft P8 gave an outer growth ring dated to AD 114, extrapolated to a felling date around AD 131',
					'c-raschpetzer-brochure-p29',
				),
				t(' — placing construction in the early-to-mid 2nd century.'),
				cite(
					' The gallery is thought to have stayed in service until roughly AD 350.',
					'c-raschpetzer-brochure-p29',
				),
			),
		},
		{ id: 'h-discovery', type: 'heading', level: 2, text: 'Discovery and excavation' },
		{
			id: 'p-discovery',
			type: 'paragraph',
			runs: p(
				cite(
					'An initial excavation attempt in 1913 found nothing conclusive. Systematic excavation resumed in 1967 and, in 1986, uncovered the qanat gallery itself',
					'c-raschpetzer-brochure-p11',
				),
				cite(
					' — since then it has been studied as one of the best-preserved examples of its kind north of the Alps',
					'c-wikipedia-raschpetzer',
				),
				t('.'),
			),
		},
		{ id: 'h-finds', type: 'heading', level: 2, text: 'Finds' },
		{
			id: 'p-finds',
			type: 'paragraph',
			runs: p(
				cite(
					"At shaft P9, the gallery's easternmost and uppermost point, excavators found a portal niche with a seepage gutter — and, preserved in the surrounding mud, oak shovels likely used to dig the gallery itself.",
					'c-raschpetzer-brochure-p10',
				),
			),
		},
		{ id: 'gal-finds', type: 'gallery', items: findsGalleryItems },
		{ id: 'h-visiting', type: 'heading', level: 2, text: 'Visiting today' },
		{
			id: 'p-visiting',
			type: 'paragraph',
			runs: p(
				cite(
					'Ten of the excavated shafts are accessible at the surface, each capped with a modern metal lid; two are fitted with windows — one over the 36-metre-deep shaft P5, the other over the overflow bifurcation at P-4 — so visitors can see down into the gallery without entering it.',
					'c-visitluxembourg-raschpetzer',
				),
			),
		},
		{ id: 'h-more-views', type: 'heading', level: 2, text: 'Additional views' },
		{
			id: 'p-more-views',
			type: 'paragraph',
			runs: p(
				cite(
					'Further photographs from the excavation campaigns — the surface trace of a shaft before digging, fieldwork inside an open pit, shaft-lining installation, and the hoist used to haul spoil out of the gallery — round out the record of how the qanat was uncovered.',
					'c-raschpetzer-more-fig2',
				),
			),
		},
		{ id: 'gal-more-views', type: 'gallery', items: moreViewsGalleryItems },
	],
	citations: [
		c.brochureOverview,
		c.brochureFlow,
		c.brochureFinds,
		c.brochureExcavation,
		c.brochureDating,
		c.wikipediaEn,
		c.visitLuxembourg,
		c.brochureMoreViews,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary: 'Initial draft from the site SSOT dataset and the 2018 brochure',
			blocks: [],
		},
		{
			id: 'r2',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Expanded with the full shaft inventory, gallery, and cross-linked topic articles',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
