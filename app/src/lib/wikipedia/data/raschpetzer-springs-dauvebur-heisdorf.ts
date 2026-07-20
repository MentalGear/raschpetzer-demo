/**
 * Real content: a deep-dive on two of the springs named in the Raschpëtzer's published
 * regional catchment figure — Dauvebur, the smallest spring in that figure, and Heisdorf,
 * by far the largest. Sourced from the companion data repo `raschpetzer-model-digital-3d`
 * (`data/hydrology.json`'s `catchment` array, `docs/RASCHPETZER_DATA.md`) and the
 * primary-source brochure it cites (vendored at `static/sources/`).
 *
 * `raschpetzer-geology.ts`'s catchment table already lists both springs' flow figures
 * alongside Geierbierg, Op der Rëll, and the qanat itself; this article does not repeat
 * that table. It goes one level deeper on just these two, because they sit at opposite
 * ends of the same regional figure and are easy to conflate if read only as a row of
 * numbers: Dauvebur (20 m³/day) is a minor spring on the Pëtschend itself, escaping along
 * a fault zone outside the qanat's own catchment — per `raschpetzer-geology.ts`'s
 * structure paragraph and `raschpetzer-petschend.ts`'s springs paragraph, both already
 * describe it that way. Heisdorf (800 m³/day) is drawn from the same
 * `data/hydrology.json` `catchment` array, but the source data does not attribute any of
 * its flow to the qanat's own ≈180 m³/day total — `raschpetzer-geology.ts`'s catchment
 * paragraph places it only as "the much larger Heisdorf spring further down the valley",
 * i.e. a separate spring the brochure's fig. 2-1 draws in for regional scale, not a
 * tributary of the Raschpëtzer's own catchment. This article keeps that distinction
 * explicit rather than implying a hydrological link the source doesn't state.
 *
 * Kept as a sibling of `raschpetzer-geology.ts` / `raschpetzer-petschend.ts` rather than a
 * section within either: this is a separate `Article` (own id/slug), cross-linked back via
 * `link('Raschpëtzer', 'raschpetzer-qanat')`, `link(…, 'raschpetzer-geology')`, and
 * `link('Helmsange', 'helmsange')` (Heisdorf village lies next to Helmsange, in the same
 * commune) in the blocks below.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not imported
// from ./mock, ./raschpetzer, ./raschpetzer-geology, nor ./raschpetzer-petschend) so this
// module has no circular dependency; mock.ts is the one that imports articles FROM here to
// append to its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto` targets are
 *  (see `$lib/paths`'s `href`) — a citation `url` literal needs the GitHub Pages project-subpath
 *  base prefixed by hand, or it 404s under a non-root `BASE_PATH` deploy (works locally where
 *  `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`
/** Build a `srcset` attribute string from `[path, widthDescriptor]` pairs, base-prefixed. */
const srcsetOf = (entries: [string, string][]): string =>
	entries.map(([path, w]) => `${asset(path)} ${w}`).join(', ')

// Every flow figure below comes from the same published figure — data/hydrology.json's
// `catchment` array, provenanced to "p.6; fig.2-1" (`_catchmentProv`) in
// docs/RASCHPETZER_DATA.md in the raschpetzer-model-digital-3d repo — so every numeric
// citation here anchors to that one page. Kept as a plain page/#page anchor (not a
// search/highlight viewer): opens the vendored PDF directly at the cited page, new tab.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	catchmentFig: {
		id: 'c-springs-dh-catchment',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — catchment springs)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	dauveburFig: {
		id: 'c-springs-dh-dauvebur',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — Dauvebur spring)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	heisdorfFig: {
		id: 'c-springs-dh-heisdorf',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — Heisdorf spring, regional comparison)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	waterAnalysis: {
		id: 'c-springs-dh-water-analysis',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 30, fig. 6-1 — comparative water analysis)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=30`,
	},
} satisfies Record<string, Citation>

export const springsDauveburHeisdorfCitations = c

export const springsDauveburHeisdorfArticle: Article = {
	id: 'a-springs-dauvebur-heisdorf',
	slug: 'dauvebur-heisdorf-springs',
	locale: 'en',
	title: 'Dauvebur and Heisdorf Springs',
	summary:
		'Dauvebur and Heisdorf are two springs named on the same published catchment figure as the Raschpëtzer qanat — but they sit at opposite ends of it. Dauvebur, on the north side of the Pëtschend plateau, is the smallest spring listed, at 20 m³/day, and lies outside the qanat’s own catchment. Heisdorf, further down the valley, runs at 800 m³/day — by far the largest figure on the map — but is not itself part of the water the qanat collects.',
	categories: ['archaeology'],
	infobox: [
		{
			label: 'Dauvebur spring — flow',
			value: '≈ 20 m³/day (smallest in the catchment figure)',
		},
		{ label: 'Dauvebur spring — location', value: 'North side of the Pëtschend plateau' },
		{
			label: 'Dauvebur spring — role',
			value: "Outside the qanat's own catchment; escapes along a fault zone",
		},
		{
			label: 'Heisdorf spring — flow',
			value: '≈ 800 m³/day (largest in the catchment figure)',
		},
		{ label: 'Heisdorf spring — location', value: 'Further down the valley, near Heisdorf' },
		{
			label: 'Heisdorf spring — role',
			value: "Regional comparison point; not part of the qanat's own catchment total",
		},
		{ label: 'Source', value: 'Brochure 2018, p. 6, fig. 2-1' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				b('Dauvebur'),
				t(' and '),
				b('Heisdorf'),
				t(' springs both appear on the same '),
				cite(
					'published catchment figure as the Raschpëtzer qanat and the other named springs of the Pëtschend plateau',
					'c-springs-dh-catchment',
				),
				t(
					', which is why they are treated together here — but the two could hardly be more different in scale or in how they relate to the qanat itself. Dauvebur is a minor local spring; Heisdorf is a much larger one, included on the same figure for regional comparison rather than as a contributor to the qanat’s own catchment.',
				),
			),
		},
		{ id: 'h-dauvebur', type: 'heading', level: 2, text: 'Dauvebur spring' },
		{
			id: 'p-dauvebur',
			type: 'paragraph',
			runs: p(
				t('Dauvebur lies on the north side of the '),
				link('Pëtschend', 'petschend-plateau'),
				t(' plateau, the ground the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' qanat is cut into, and runs at '),
				cite('roughly 20 cubic metres a day', 'c-springs-dh-dauvebur'),
				t(
					' — the smallest flow of any spring named in the catchment figure, and about a ninth of the qanat’s own average discharge. It is also, hydrologically, a separate outflow rather than a source the qanat taps: groundwater at Dauvebur escapes along one of the fault zones bounding the Pëtschend horst, outside the qanat’s own catchment area, rather than draining toward the shaft line the way water collecting on the sandstone/marl interface does. For the fault geometry behind that, see ',
				),
				link('Geology and Hydrology of the Pëtschend', 'raschpetzer-geology'),
				t('.'),
			),
		},
		{
			id: 'fig-water-analysis',
			type: 'figure',
			alt: 'A German-language table comparing the mineral chemistry of water sampled from the Raschpëtzer qanat at shaft P-4 and from the Dauvebur spring on 27 July 2003, covering electrical conductivity, pH, nitrite, ammonium, and total/carbonate hardness',
			caption:
				'Comparative water analysis: the Raschpëtzer qanat (sampled at P-4) runs slightly less mineralised and less hard than the adjacent Dauvebur spring, though the two are chemically close.',
			credit: 'Staatslaboratorium, samples of 27 July 2003, in Faber, Waringo & Werner, 2018 (brochure fig. 6-1, p. 30 — matched to this scan by visual content; a folder-wide audit found this corpus’s plain `FigN-NN.jpg` source scans are shuffled relative to the brochure’s own figure numbers, so the pairing was verified against the brochure page text rather than trusted from the source filename)',
			tone: 1,
			ratio: 1027 / 1059,
			src: asset('/img/raschpetzer/Fig6-01-fallback.jpg'),
			srcset: srcsetOf([
				['/img/raschpetzer/Fig6-01-480w.webp', '480w'],
				['/img/raschpetzer/Fig6-01-960w.webp', '960w'],
			]),
		},
		{ id: 'h-heisdorf', type: 'heading', level: 2, text: 'Heisdorf spring' },
		{
			id: 'p-heisdorf',
			type: 'paragraph',
			runs: p(
				t('Heisdorf, by contrast, runs at '),
				cite('around 800 cubic metres a day', 'c-springs-dh-heisdorf'),
				t(
					' — well over four times the qanat’s own average flow, and by far the largest single figure on the catchment map. It lies further down the valley, near the village of Heisdorf, adjoining ',
				),
				link('Helmsange', 'helmsange'),
				t(' in the same commune of Walferdange. '),
				cite(
					'The source figure places Heisdorf alongside the Pëtschend-area springs for regional scale, but does not attribute any of its flow to the qanat’s own catchment',
					'c-springs-dh-heisdorf',
				),
				t(
					' — nothing in the underlying dataset ties Heisdorf’s water to the gallery the Romans cut into the Pëtschend, and this article does not assume a hydrological connection the source itself does not state. It is best read as a nearby, much larger spring the brochure uses for comparison, not as a tributary of the Raschpëtzer.',
				),
			),
		},
		{ id: 'h-together', type: 'heading', level: 2, text: 'Why the two appear together' },
		{
			id: 'p-together',
			type: 'paragraph',
			runs: p(
				t(
					'Dauvebur and Heisdorf end up on the same figure for different reasons: Dauvebur because it sits right next to the qanat’s own catchment, close enough to matter to the local hydrology even though its water goes elsewhere; Heisdorf because its much larger flow gives readers a regional yardstick against which the qanat’s modest ≈180 m³/day, and the even smaller Dauvebur, can be judged. Neither relationship makes Heisdorf part of the qanat’s water supply. For how the qanat’s own catchment — Geierbierg, Op der Rëll, and the qanat’s own shaft line — adds up, see ',
				),
				link('Geology and Hydrology of the Pëtschend', 'raschpetzer-geology'),
				t('.'),
			),
		},
	],
	citations: [c.catchmentFig, c.dauveburFig, c.heisdorfFig, c.waterAnalysis],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: the Dauvebur and Heisdorf springs from the site SSOT hydrology dataset and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
