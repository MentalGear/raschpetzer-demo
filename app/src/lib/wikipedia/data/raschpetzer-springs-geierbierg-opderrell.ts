/**
 * Real content: the Geierbierg and Op der Rëll springs, two of the springs mapped in the
 * wider catchment around the Raschpëtzer qanat. Sourced from the companion data repo
 * `raschpetzer-model-digital-3d` (`data/hydrology.json`'s `catchment` array,
 * `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it cites (vendored at
 * `static/sources/`). Every specific fact/number carries its own adjacent citation (not
 * just one somewhere in the paragraph) — see the per-clause `cite()` calls below.
 *
 * `raschpetzer-geology.ts` already lists both springs' flow rates in its `tbl-catchment`
 * table (p-catchment / tbl-catchment); this article goes deeper on the two springs
 * themselves rather than repeating that table, and links back to it for the full
 * catchment comparison (Dauvebur, the qanat's own yield, and Heisdorf further down the
 * valley).
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./mock, ./raschpetzer, or ./raschpetzer-geology) so this module has no
// circular dependency; mock.ts is the one that imports articles FROM here to append to
// its exported corpus.
const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto`
 *  targets are (see `$lib/paths`'s `href`) — a citation `url` literal needs the GitHub
 *  Pages project-subpath base prefixed by hand, or it 404s under a non-root `BASE_PATH`
 *  deploy (works locally where `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`

// Local page locators into the vendored brochure PDF, per data/hydrology.json's
// `catchment` / `_catchmentProv` map (source: brochure2018, loc: "p.6; fig.2-1") in the
// raschpetzer-model-digital-3d repo — kept as plain #page anchors (not a search/highlight
// viewer): opens the vendored PDF directly at the cited page, new tab. IDs are prefixed
// `c-springs-go-` (unique to this article) even though they all cite the same brochure
// page as raschpetzer-geology.ts's `c-geology-catchment`, since each Article owns its own
// citation list.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	catchmentMap: {
		id: 'c-springs-go-catchment-map',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — catchment springs)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	geierbiergFlow: {
		id: 'c-springs-go-geierbierg-flow',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — Geierbierg spring discharge)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	opderrellFlow: {
		id: 'c-springs-go-opderrell-flow',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — Op der Rëll spring discharge)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	qanatCatchmentFlow: {
		id: 'c-springs-go-qanat-catchment-flow',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — qanat conduit shown on the catchment map)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	horstStructure: {
		id: 'c-springs-go-horst-structure',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 14, fig. 4-3 — the Pëtschend horst and bounding faults)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=14`,
	},
} satisfies Record<string, Citation>

export const springsGeierbiergOpderrellCitations = c

export const springsGeierbiergOpderrellArticle: Article = {
	id: 'a-springs-geierbierg-opderrell',
	slug: 'geierbierg-opderrell-springs',
	locale: 'en',
	title: 'Geierbierg and Op der Rëll Springs',
	summary:
		'Geierbierg and Op der Rëll are two springs mapped in the wider catchment around the Raschpëtzer qanat, on the Pëtschend plateau near Walferdange, Luxembourg. Geierbierg discharges roughly 80 m³/day; Op der Rëll discharges roughly 220 m³/day, making it the largest single spring in that catchment.',
	categories: ['archaeology'],
	infobox: [
		{ label: 'Geierbierg spring flow', value: '≈ 80 m³/day' },
		{ label: 'Op der Rëll spring flow', value: '≈ 220 m³/day (largest in the catchment)' },
		{ label: 'Catchment area', value: 'Pëtschend plateau / Haedchen depression, Walferdange' },
		{ label: 'Source', value: 'Brochure 2018, p. 6, fig. 2-1' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Geierbierg and Op der Rëll are two of the springs mapped in the wider '),
				link('catchment', 'raschpetzer-geology'),
				t(
					' surrounding the Raschpëtzer plateau, alongside the Dauvebur spring and the much larger Heisdorf spring further down the valley.',
				),
				cite(
					' Both are plotted, with their measured discharge, on the catchment map in the 2018 brochure',
					'c-springs-go-catchment-map',
				),
				t(' — the same source that documents the '),
				link('Raschpëtzer qanat', 'raschpetzer-qanat'),
				t("'s own gravity-fed conduit a short distance away."),
			),
		},
		{ id: 'h-geierbierg', type: 'heading', level: 2, text: 'Geierbierg spring' },
		{
			id: 'p-geierbierg',
			type: 'paragraph',
			runs: p(
				t('The Geierbierg spring discharges '),
				cite('about 80 cubic metres of water a day', 'c-springs-go-geierbierg-flow'),
				t(', a modest yield next to the qanat’s own average conduit flow — roughly '),
				cite('180 m³/day', 'c-springs-go-qanat-catchment-flow'),
				t(
					' — but a real contributor to the region’s overall water budget as mapped in the brochure’s catchment figure.',
				),
			),
		},
		{ id: 'h-opderrell', type: 'heading', level: 2, text: 'Op der Rëll spring' },
		{
			id: 'p-opderrell',
			type: 'paragraph',
			runs: p(
				t('The Op der Rëll spring discharges '),
				cite('about 220 cubic metres of water a day', 'c-springs-go-opderrell-flow'),
				t(
					' — more than double Geierbierg’s yield and, of the springs plotted on the catchment map, the largest short of the much larger Heisdorf spring further down the valley.',
				),
				cite(
					' Op der Rëll lies south of the Pëtschend horst, where groundwater escapes to the surface along the horst-bounding fault zone rather than draining east toward the qanat’s own mother shaft',
					'c-springs-go-horst-structure',
				),
				t(
					', so its water reaches daylight independently of the qanat’s gallery even though both are fed by the same plateau aquifer.',
				),
			),
		},
		{ id: 'h-role', type: 'heading', level: 2, text: "Role in the qanat's catchment" },
		{
			id: 'p-role',
			type: 'paragraph',
			runs: p(
				t(
					'Set side by side, Op der Rëll is the dominant contributor among the catchment’s named springs: its ',
				),
				cite('≈ 220 m³/day', 'c-springs-go-opderrell-flow'),
				t(' outpaces Geierbierg’s '),
				cite('≈ 80 m³/day', 'c-springs-go-geierbierg-flow'),
				t(
					' by nearly three to one, and exceeds even the qanat’s own captured yield. Only the Heisdorf spring, well outside the immediate plateau catchment, discharges more.',
				),
				t(
					' Because Geierbierg and Op der Rëll surface independently of the qanat gallery, neither adds water to the Raschpëtzer’s own conduit — they instead mark the scale of the groundwater resource the Roman builders were tapping into with the qanat, and the ',
				),
				link('geology and hydrology', 'raschpetzer-geology'),
				t(
					' article covers the full catchment comparison, including Dauvebur and Heisdorf.',
				),
			),
		},
	],
	citations: [
		c.catchmentMap,
		c.geierbiergFlow,
		c.opderrellFlow,
		c.qanatCatchmentFlow,
		c.horstStructure,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Initial draft from the site SSOT hydrology dataset and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
