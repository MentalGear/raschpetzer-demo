/**
 * Real content: a deep-dive on the Luxembourg Sandstone (Grès de Luxembourg) — the Early
 * Jurassic formation that is the Raschpëtzer qanat's water source. Sourced from the
 * companion data repo `raschpetzer-model-digital-3d` (`data/geology.json`,
 * `data/hydrology.json`, `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it
 * cites (vendored at `static/sources/`) for the *local* facts (the "li2" sandstone unit's
 * thickness/elevation at the Pëtschend, its confining layers, the flow/chemistry the
 * aquifer expresses at the qanat), plus external, citable web research for the
 * *formation-level* facts (age, regional thickness/composition, why it's permeable, and
 * its role as Luxembourg's principal aquifer — including the Luxembourg City connection,
 * confirmed via `vdl.lu`). Every specific fact/number carries its own adjacent citation
 * (not just one somewhere in the paragraph) — see the per-clause `cite()` calls below.
 *
 * Deliberately does NOT repeat `raschpetzer-geology.ts`'s five-layer stratigraphy table —
 * this article treats the aquifer as a hydrogeological feature in its own right (what the
 * rock is, why it holds/moves water, how it's confined, how it surfaces here, and its
 * regional significance), and links back to that article for the full stratigraphic
 * breakdown instead of duplicating it.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./mock, ./raschpetzer, or ./raschpetzer-geology) so this module has no
// circular dependency; mock.ts is the one that imports articles FROM here to append to
// its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
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

// Local page locators into the vendored brochure PDF, per data/geology.json's /
// data/hydrology.json's `_prov` maps in the raschpetzer-model-digital-3d repo — kept as
// plain #page anchors (not a search/highlight viewer): opens the vendored PDF directly at
// the cited page, new tab. IDs are prefixed `c-aquifer-` (unique to this article) even
// where they cite the same brochure pages as raschpetzer-geology.ts's `c-geology-*`
// citations, since each Article owns its own citation list.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	wikiFormation: {
		id: 'c-aquifer-wikipedia-formation',
		title: 'Luxembourg Sandstone',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Luxembourg_Sandstone',
	},
	wikiGeologyLux: {
		id: 'c-aquifer-geology-of-luxembourg',
		title: 'Geology of Luxembourg',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Geology_of_Luxembourg',
	},
	meusWillems2021: {
		id: 'c-aquifer-meus-willems-2021',
		title: 'Tracer tests to infer the drainage of the multiple porosity aquifer of Luxembourg Sandstone (Grand-Duchy of Luxembourg): implications for drinking water protection',
		authors: 'Meus, Philippe; Willems, Luc',
		year: 2021,
		publisher: 'Hydrogeology Journal, vol. 29, pp. 461–480',
		url: 'https://doi.org/10.1007/s10040-020-02274-z',
	},
	vdlSprings: {
		id: 'c-aquifer-vdl-springs',
		title: 'From spring to tap',
		publisher: 'Ville de Luxembourg (City of Luxembourg)',
		url: 'https://www.vdl.lu/en/city/projects-and-commitments/environment/drinking-water/spring-tap',
	},
	brochureAquifer: {
		id: 'c-aquifer-brochure-aquifer',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, the Luxembourg sandstone aquifer)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	brochureStrata: {
		id: 'c-aquifer-brochure-strata',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 15, fig. 4-2/4-3 — stratigraphy of the Pëtschend)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=15`,
	},
	brochureStructure: {
		id: 'c-aquifer-brochure-structure',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 14, fig. 4-3 — the Pëtschend horst and strata dip)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=14`,
	},
	brochureFlow: {
		id: 'c-aquifer-brochure-flow',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 29, average discharge)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=29`,
	},
	brochureChemistry: {
		id: 'c-aquifer-brochure-chemistry',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 30, table 6-1 — water chemistry)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=30`,
	},
	brochureSpringInflux: {
		id: 'c-aquifer-brochure-spring-influx',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 28, spring influx near shaft P8)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=28`,
	},
} satisfies Record<string, Citation>

export const aquiferCitations = c

export const aquiferArticle: Article = {
	id: 'a-aquifer',
	slug: 'luxembourg-sandstone-aquifer',
	locale: 'en',
	title: 'The Luxembourg Sandstone Aquifer',
	summary:
		'The Luxembourg Sandstone (Grès de Luxembourg) is the Early Jurassic bedrock formation whose groundwater the Raschpëtzer qanat was built to capture: a porous, fractured sandstone that pools water on an impermeable marl floor beneath the Pëtschend plateau — and the same formation that still supplies most of Luxembourg’s groundwater today, including roughly 60% of Luxembourg City’s own drinking water.',
	categories: ['archaeology', 'technology'],
	infobox: [
		{ label: 'Formation', value: 'Luxembourg Sandstone (Grès de Luxembourg)' },
		{ label: 'Age', value: 'Early Jurassic, Hettangian–Sinemurian (≈ 201–191 Ma)' },
		{ label: 'Regional thickness', value: 'up to 100 m' },
		{ label: 'Local thickness (unit "li2", Pëtschend)', value: '30–80 m' },
		{ label: 'Aquifer type', value: 'Unconfined (water-table), floored by an aquitard' },
		{ label: 'Permeability', value: 'Dual: primary (pore) + secondary (fracture)' },
		{ label: 'National groundwater output', value: '≈ 65 million m³/year' },
		{ label: "Share of Luxembourg City's own drinking water", value: '≈ 60% (own springs)' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Every metre of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat was surveyed and cut to intercept a single hydrogeological feature: groundwater held in the ',
				),
				b('Luxembourg Sandstone'),
				t(
					', the regional bedrock aquifer whose local stratigraphy at the site is set out layer by layer in ',
				),
				link('Geology and Hydrology of the Pëtschend', 'raschpetzer-geology'),
				t(
					'. This article looks at that aquifer on its own terms — what the rock is, why it holds and moves water, how it is confined, and how its water reaches the surface here as the springs the qanat was built to capture.',
				),
			),
		},
		{ id: 'h-formation', type: 'heading', level: 2, text: 'A Liassic sandstone formation' },
		{
			id: 'p-formation',
			type: 'paragraph',
			runs: p(
				cite(
					'The Luxembourg Sandstone formed in the Early Jurassic, spanning the Hettangian to Sinemurian stages — roughly 201 to 191 million years ago',
					'c-aquifer-wikipedia-formation',
				),
				t(' — the interval Luxembourgish geologists call the '),
				b('Lias'),
				t(
					'. It accumulated as a clastic wedge of marginal-marine sand and silt spreading over older continental Triassic rock across what is now the Trier–Luxembourg Basin.',
				),
				cite(
					' Regionally the formation reaches up to 100 metres thick and consists of carbonaceous, poorly cemented sandstone interbedded with sandy limestone',
					'c-aquifer-wikipedia-formation',
				),
				t(
					' — a weak, porous fabric that turns out to matter as much for its plumbing as for its age. ',
				),
				cite(
					'Beneath the Pëtschend plateau itself the formation (mapped locally as unit "li2") is 30–80 metres thick, at an elevation of roughly 350–400 metres above sea level',
					'c-aquifer-brochure-aquifer',
				),
				t('.'),
			),
		},
		{ id: 'h-permeability', type: 'heading', level: 2, text: 'Why it holds and moves water' },
		{
			id: 'p-permeability',
			type: 'paragraph',
			runs: p(
				t(
					'A rock only functions as an aquifer if it can both store water and let it flow, and the Luxembourg Sandstone does both for two compounding reasons. First, its ',
				),
				cite(
					'poor cementation leaves real pore space between grains',
					'c-aquifer-wikipedia-formation',
				),
				t(
					' — primary porosity that lets the rock itself soak up and hold groundwater like a sponge. Second, the formation is cut by faults and joints: ',
				),
				cite(
					'tracer tests tracking 112 dye injections to 102 springs across the aquifer found that fractures, not the porous rock matrix, control most of the actual flow routes — meaning the aquifer behaves hydrogeologically as a dual- or multiple-porosity system',
					'c-aquifer-meus-willems-2021',
				),
				t(
					'. The Pëtschend is a case of that second mechanism at work close up: it is a fault-bounded ',
				),
				cite(
					'horst, with the bounding faults re-aligning the strata to a near-vertical dip',
					'c-aquifer-brochure-structure',
				),
				t(
					' — fracture zones that leak some of the plateau’s groundwater away from the qanat’s own catchment entirely, to the separate Dauvebur and Op der Rëll springs.',
				),
			),
		},
		{
			id: 'h-confined',
			type: 'heading',
			level: 2,
			text: 'A water-table aquifer, sealed from below',
		},
		{
			id: 'p-confined',
			type: 'paragraph',
			runs: p(
				t(
					'At the Pëtschend the sandstone is not sandwiched between two seals; it is floored by one. ',
				),
				cite(
					'Beneath the sandstone lies an aquitard of sandy marl, marl and limestone (unit "li1"), and beneath that, impermeable Keuper mudstone and dolomitic marl',
					'c-aquifer-brochure-strata',
				),
				t(
					' — low-permeability rock the water in the sandstone cannot cross. Above the sandstone there is no equivalent seal, only a thin, permeable weathered-rock cover through which rain recharges the aquifer directly. The result is a classic ',
				),
				b('water-table aquifer'),
				t(
					': water sinks in from above, then pools on the impermeable floor rather than draining further down, so ',
				),
				cite(
					'groundwater accumulates specifically at the sandstone/marl interface',
					'c-aquifer-brochure-aquifer',
				),
				t(' and, following the regional dip, '),
				cite(
					'flows east, down-dip, toward the mother shaft',
					'c-aquifer-brochure-structure',
				),
				t(
					'. (The complete five-layer sequence — cover, aquifer, aquitard, and the two impermeable Keuper beds beneath — is tabulated in ',
				),
				link('Geology and Hydrology of the Pëtschend', 'raschpetzer-geology'),
				t('.)'),
			),
		},
		{
			id: 'h-surface',
			type: 'heading',
			level: 2,
			text: 'From aquifer to spring: reaching the surface at Raschpëtzer',
		},
		{
			id: 'p-surface',
			type: 'paragraph',
			runs: p(
				t(
					'A water-table aquifer normally reveals itself only where erosion happens to cut the ground surface down to that saturated interface — a natural spring, at a time and place the aquifer chooses. A qanat inverts that: instead of waiting for the water table to daylight on its own, its builders drove a gallery ',
				),
				b('to'),
				t(
					' the interface and let gravity carry the water out along a surveyed, engineered route. Along the way, the aquifer keeps contributing: ',
				),
				cite(
					'a small spring feeds roughly 25 cubic metres a day back into the gallery just upstream of shaft P8',
					'c-aquifer-brochure-spring-influx',
				),
				t(
					' — direct evidence the sandstone is leaking groundwater into the gallery through fractures along its length, not only at the uppermost shaft. ',
				),
				cite(
					'The gallery today carries an average of about 180 cubic metres of water a day, down from a historical estimate of roughly 250 m³/day inferred from a sinter line above the present water level',
					'c-aquifer-brochure-flow',
				),
				t(
					' — a decline that, on an aquifer this fracture-dependent, plausibly tracks changes in how efficiently individual fissures drain rather than any change in regional rainfall. ',
				),
				cite(
					'The water itself is hard and strongly mineralised — hardness 23.4 °fH, conductivity 478 µS/cm, pH 7.8',
					'c-aquifer-brochure-chemistry',
				),
				t(
					', chemistry consistent with groundwater that spent time in slow contact with the sandstone and the marl beneath it before emerging. For the shaft-by-shaft engineering that captures this water, see ',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t('.'),
			),
		},
		{ id: 'h-significance', type: 'heading', level: 2, text: 'A regional water resource' },
		{
			id: 'p-significance',
			type: 'paragraph',
			runs: p(
				t(
					'The Luxembourg Sandstone is not a local curiosity confined to the Pëtschend — it is the country’s principal aquifer. ',
				),
				cite(
					'Most of Luxembourg’s groundwater is drawn from the formation, which produces on the order of 65 million cubic metres of water a year',
					'c-aquifer-geology-of-luxembourg',
				),
				t('. The clearest modern illustration is the capital itself: '),
				cite(
					'roughly 60% of Luxembourg City’s own drinking water still comes from its own springs — at Muhlenbach, Septfontaines, Pulvermühl, Grunewald, Kopstal and Birelergrund — rising from that same sandstone aquifer, with the remaining 40% piped in from the Upper Sûre reservoir',
					'c-aquifer-vdl-springs',
				),
				t(
					'. The Raschpëtzer draws on a separate stretch of that same formation, on the Pëtschend horst, outside the city’s own catchment — its water never reached Luxembourg City — but the parallel holds: two millennia apart, a Roman qanat and a modern capital solved the same problem by drawing on the same rock.',
				),
			),
		},
	],
	citations: [
		c.wikiFormation,
		c.wikiGeologyLux,
		c.meusWillems2021,
		c.vdlSprings,
		c.brochureAquifer,
		c.brochureStrata,
		c.brochureStructure,
		c.brochureFlow,
		c.brochureChemistry,
		c.brochureSpringInflux,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT + web research',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: aquifer deep-dive from the site geology/hydrology dataset plus external research on the Luxembourg Sandstone formation',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT', 'web research'],
}
