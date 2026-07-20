/**
 * Real content: the Raschpëtzer gallery and channel — the underground conduit itself (as
 * opposed to the shafts that reach it, see `raschpetzer-shafts.ts`). Sourced from the
 * companion data repo `raschpetzer-model-digital-3d` (`data/gallery.json`,
 * `docs/RASCHPETZER_DATA.md`'s "Gallery & channel" section) and the primary-source brochure
 * it cites (vendored at `static/sources/`). Every specific fact/number carries its own
 * adjacent citation (not just one somewhere in the paragraph) — see the per-clause `cite()`
 * calls below. Every citation that has a real URL/page locator is deep-linked
 * (`Citation.url`, opened in a new tab by `ArticleReader`'s references list) — see the
 * `c.gallery*`'s `#page=N` fragments.
 *
 * Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
 * imported from ./mock, nor from ./raschpetzer) so this module has no circular dependency;
 * mock.ts is the one that imports articles FROM data modules like this to append to its
 * exported corpus.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto`
 *  targets are — a `<img src>`/citation `url` literal needs the GitHub Pages
 *  project-subpath base prefixed by hand, or it 404s under a non-root `BASE_PATH` deploy
 *  (works locally where `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`
/** Build a `srcset` attribute string from `[path, widthDescriptor]` pairs, base-prefixed. */
const srcsetOf = (entries: [string, string][]): string =>
	entries.map(([path, w]) => `${asset(path)} ${w}`).join(', ')

// Page locators per data/gallery.json's `_prov` map / docs/RASCHPETZER_DATA.md's "Gallery &
// channel" section in the raschpetzer-model-digital-3d repo — kept as plain page/#page
// anchors (not a search/highlight viewer): opens the vendored PDF directly at the cited
// page, new tab.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	gradient: {
		id: 'c-gallery-gradient',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 26–27, gallery gradient and stepped falls)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=26`,
	},
	channel: {
		id: 'c-gallery-channel',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 28, channel dimensions and construction)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=28`,
	},
	sections: {
		id: 'c-gallery-sections',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 23; fig. 5-15, gallery sections by host rock)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=23`,
	},
	overflow: {
		id: 'c-gallery-overflow',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20; fig. 5-11, 5-14, the P-4 overflow weir)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	hydrology: {
		id: 'c-gallery-hydrology',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 30, flow diverted at the P-4 weir)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=30`,
	},
	auxiliary: {
		id: 'c-gallery-auxiliary',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 21–22, the auxiliary dry channel)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=21`,
	},
	surveyOutlet: {
		id: 'c-gallery-survey-outlet',
		title: 'Field-surveyed coordinates of the P-4 overflow resurgence outlet (WGS84 / LUREF / UTM32N)',
		authors: 'raschpetzer-model-digital-3d project',
		publisher: 'Companion GIS/3D model dataset (data/gallery.json)',
	},
	moreGeology: {
		id: 'c-gallery-more-1',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (ch. 3, hydrogeological and stratigraphic cross-sections along the shaft line)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=7`,
	},
	morePhotos: {
		id: 'c-gallery-more-2',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (ch. 3, excavation photographs of a shaft head and the gallery interior)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=8`,
	},
} satisfies Record<string, Citation>

export const galleryCitations = c

export const galleryArticle: Article = {
	id: 'a-raschpetzer-gallery',
	slug: 'raschpetzer-gallery',
	locale: 'en',
	title: 'Gallery and Channel Construction',
	summary:
		"The Raschpëtzer's underground gallery carries its water conduit on an almost perfectly level 0.1% gradient from shaft P9 to shaft P-5, broken by two deliberate stepped drops, with a small stone-lined channel let into the gallery floor and a weir near shaft P-4 that sheds excess flow into a separate lateral channel.",
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The gallery of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' carries its water conduit from shaft P9 down to shaft P-5 at an almost perfectly constant gradient of ',
				),
				cite('just 0.1% — 10 centimetres of fall per 100 metres', 'c-gallery-gradient'),
				t(
					' — a level of precision that had to be held over hundreds of metres of hand-cut sandstone. The only deliberate departures from that steady fall are two ',
				),
				b('stepped drops'),
				cite(
					': 1.2 metres under shaft P6, and a further 1.0 metre under shaft P4, where the gallery and channel step down below a band of limestone.',
					'c-gallery-gradient',
				),
				t(' Access to the gallery is via the same '),
				link('shafts', 'raschpetzer-shafts'),
				t(' that mark its route at the surface.'),
			),
		},
		{ id: 'h-channel', type: 'heading', level: 2, text: 'Channel construction' },
		{
			id: 'p-channel',
			type: 'paragraph',
			runs: p(
				cite(
					'Let into the floor of the gallery is a small dry-masonry channel, about 45 centimetres high and only 12 to 15 centimetres wide, carrying a stream of water 5 to 7 centimetres deep',
					'c-gallery-channel',
				),
				t(
					' — the gallery itself is far roomier than the conduit it was built to protect, wide and tall enough for a person to walk and work in, but the water ran only in this narrow stone-lined trench at the bottom.',
				),
				cite(
					' The channel floor was deliberately cut to follow the boundary between the overlying sandstone and the underlying marl',
					'c-gallery-channel',
				),
				t(
					', the same geological seam the springs feeding the qanat drain from, with cover slabs and a bed of rubble ballast packed in above it to seal and support the conduit.',
				),
			),
		},
		{
			id: 'fig-xsec',
			type: 'figure',
			tone: 2,
			alt: 'Schematic cross-section of the gallery, showing rubble ballast and cover above a stone-lined water channel let into the floor at the boundary between the overlying rock and the underlying marl',
			caption:
				'Generalized cross-section of the gallery: a stone-lined water channel at the floor, backed by rubble ballast, with the boundary between the overlying rock and the marl below running just beneath it.',
			credit: 'Illustration: raschpetzer-model-digital-3d project',
			src: asset('/img/raschpetzer/gallery-xsec-2.webp'),
			ratio: 560 / 1166,
		},
		{ id: 'h-sections', type: 'heading', level: 2, text: 'Gallery sections' },
		{
			id: 'p-sections',
			type: 'paragraph',
			runs: p(
				cite(
					'The host rock and the shape of the gallery both change along its route, tracked here leg by leg between shafts.',
					'c-gallery-sections',
				),
			),
		},
		{
			id: 'tbl-sections',
			type: 'table',
			headers: ['Leg', 'Host rock', 'Profile'],
			rows: [
				['P9 → P6', 'Solid rock', 'Rectangular'],
				['P6 → P5', 'Intersecting marl', 'Trapezoidal'],
				['P5 → P4', 'Limestone walls', 'Wide'],
				['P4 → P0', 'Limestone crown', 'Triangular'],
				['P0 → P-5', 'Marl', 'Backfilled'],
			],
		},
		{ id: 'h-overflow', type: 'heading', level: 2, text: 'The P-4 overflow weir' },
		{
			id: 'p-overflow',
			type: 'paragraph',
			runs: p(
				cite(
					'Near shaft P-4 the main channel is fitted with a weir: when the water level in the channel dams up above roughly 12 centimetres, the surplus spills over into a separate 80-centimetre-wide lateral channel',
					'c-gallery-overflow',
				),
				cite(
					' that can carry off around 80 cubic metres of water a day',
					'c-gallery-hydrology',
				),
				t(
					' — a deliberate deviation, distinct from the main conduit, that kept the gallery from flooding during periods of high flow.',
				),
			),
		},
		{
			id: 'p-overflow-outlet',
			type: 'paragraph',
			runs: p(
				cite(
					'That diverted flow stays underground as a lateral drain near the channel level and resurfaces downslope of the weir rather than at any visible daylight structure',
					'c-gallery-survey-outlet',
				),
				t(
					'; the resurgence outlet has since been field-surveyed at 6.147987° E, 49.666272° N (WGS84) — LUREF 78546 E / 81300 N, UTM32N 294207 / 5505432.',
				),
			),
		},
		{
			id: 'fig-overflow',
			type: 'figure',
			tone: 3,
			alt: 'Stratigraphic cross-section drawing along the gallery route between shafts P-5 and P-4, showing the rock layers, the shaft linings, and the water channel with a dashed arrow indicating water draining downward near P-4',
			caption:
				'Cross-section of the gallery route between shafts P-5 and P-4: the stratigraphy above the channel, and (dashed arrow, right) the P-4 weir diverting water downward into the lateral overflow channel.',
			credit: 'Waringo & Werner, 2000/2016, in Faber, Waringo & Werner, 2018',
			src: asset('/img/raschpetzer/Fig5-12-fallback.jpg'),
			srcset: srcsetOf([
				['/img/raschpetzer/Fig5-12-480w.webp', '480w'],
				['/img/raschpetzer/Fig5-12-960w.webp', '960w'],
				['/img/raschpetzer/Fig5-12-1920w.webp', '1920w'],
			]),
			sizes: '(min-width: 768px) 640px, 100vw',
			ratio: 2553 / 1887,
		},
		{ id: 'h-auxiliary', type: 'heading', level: 2, text: 'Auxiliary channel' },
		{
			id: 'p-auxiliary',
			type: 'paragraph',
			runs: p(
				cite(
					'A second, separate channel serves shafts P-7A and P-5A: it runs higher than the main aquiferous conduit and was never connected to it',
					'c-gallery-auxiliary',
				),
				t(
					', so unlike the main channel it stayed dry — a distinct branch of the system rather than a tributary feeding into the primary flow.',
				),
			),
		},
		{ id: 'h-more-views', type: 'heading', level: 2, text: 'Further views' },
		{
			id: 'p-more-views',
			type: 'paragraph',
			runs: p(
				cite(
					'Hydrogeological and stratigraphic cross-sections along the shaft line place the gallery in the same host-rock succession summarized above',
					'c-gallery-more-1',
				),
				cite(
					', and excavation photographs of an opened shaft head and the gallery interior document the stone-lined channel firsthand.',
					'c-gallery-more-2',
				),
			),
		},
		{
			id: 'gallery-more-views',
			type: 'gallery',
			items: [
				{
					id: 'gi-shaft-profile',
					alt: 'Hydrogeological cross-section running west to east through shafts P-1 to P9, showing groundwater flowing through the Luxembourg sandstone above the marl and limestone that the gallery is cut into',
					caption:
						'West–east profile along the full shaft line, P-1 to P9: groundwater moving through the sandstone above, the qanat channel carrying the collected water west toward the Alzette valley below.',
					credit: 'Faber, Waringo & Werner, 2018',
					tone: 1,
					ratio: 2365 / 1385,
					src: asset('/img/raschpetzer/Fig3-02-fallback.jpg'),
					srcset: srcsetOf([
						['/img/raschpetzer/Fig3-02-480w.webp', '480w'],
						['/img/raschpetzer/Fig3-02-960w.webp', '960w'],
						['/img/raschpetzer/Fig3-02-1920w.webp', '1920w'],
					]),
					sizes: '(min-width: 768px) 640px, 100vw',
				},
				{
					id: 'gi-strata-detail',
					alt: 'Detailed north–south geological cross-section beneath shafts P4 and P5, showing Luxembourg sandstone thinning with depth into marl-and-limestone, over red mudstone and dolomitic marl',
					caption:
						'Detailed section through shafts P4 and P5: the sandstone thins with depth into the marl-and-limestone that hosts the gallery here, over red mudstone and dolomitic marl.',
					credit: 'Faber, Waringo & Werner, 2018',
					tone: 4,
					ratio: 1983 / 1524,
					src: asset('/img/raschpetzer/Fig3-03-fallback.jpg'),
					srcset: srcsetOf([
						['/img/raschpetzer/Fig3-03-480w.webp', '480w'],
						['/img/raschpetzer/Fig3-03-960w.webp', '960w'],
						['/img/raschpetzer/Fig3-03-1920w.webp', '1920w'],
					]),
					sizes: '(min-width: 768px) 640px, 100vw',
				},
				{
					id: 'gi-gallery-photos',
					alt: 'Two photographs: (a) an excavated pit exposing a shaft head with worked stone at the surface; (b) the interior of the gallery, a narrow rock-cut passage with the stone-lined water channel at the floor',
					caption:
						'(a) A shaft head exposed by excavation; (b) inside the gallery, the passage narrows toward the stone-lined channel let into the floor.',
					credit: 'Faber, Waringo & Werner, 2018',
					tone: 5,
					ratio: 2404 / 1663,
					src: asset('/img/raschpetzer/Fig3-04-fallback.jpg'),
					srcset: srcsetOf([
						['/img/raschpetzer/Fig3-04-480w.webp', '480w'],
						['/img/raschpetzer/Fig3-04-960w.webp', '960w'],
						['/img/raschpetzer/Fig3-04-1920w.webp', '1920w'],
					]),
					sizes: '(min-width: 768px) 640px, 100vw',
				},
			],
		},
	],
	citations: [
		c.gradient,
		c.channel,
		c.sections,
		c.overflow,
		c.hydrology,
		c.auxiliary,
		c.surveyOutlet,
		c.moreGeology,
		c.morePhotos,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary: 'Initial draft from the site SSOT dataset and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
