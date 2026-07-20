/**
 * Real content: the Pëtschend Plateau and the neighbouring Haedchen Depression, the landforms
 * whose springs feed the Raschpëtzer qanat. Sourced from the companion data repo
 * `raschpetzer-model-digital-3d` (`data/site.json`'s `regions` array, `data/hydrology.json`'s
 * catchment table, `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it cites
 * (vendored at `static/sources/`), plus the site's own published topographic figure (the same
 * map already used as `raschpetzer.ts`'s `fig-catchment` block — springs A/B/C, the "Villa
 * Romaine" label, and the fault traces are read directly off that map for the spatial claims
 * below), and external web corroboration (romanaqueducts.info, chronicle.lu).
 *
 * `data/hydrology.json`'s catchment table (also reproduced in `raschpetzer-geology.ts`) gives
 * flow figures for Op der Rëll, Dauvebur and Geierbierg, but does not state which landform each
 * sits on; only `raschpetzer-geology.ts`'s prose ties Dauvebur to the north side and Op der Rëll
 * to the south, which is also where the topographic map places them. Geierbierg's position isn't
 * stated anywhere in the SSOT, so it is deliberately not placed on a landform here — see the
 * catchment paragraph below. The map's third spring, labelled "Haedchen spring", does not appear
 * under that name in the flow table either; it is presented here as a place name read off the
 * map, not as a sourced flow figure.
 *
 * The "Villa Romaine" label on that same map is a separate thing from `site.json`'s `villa`
 * object (the qanat's *inferred* downslope recipient site in the Alzette valley, covered in
 * `raschpetzer-walferdange.ts`) — the two are kept distinct below, not conflated.
 *
 * Kept as a sibling of `raschpetzer.ts` / `raschpetzer-geology.ts` rather than a section within
 * either: this is a separate `Article` (own id/slug — 'petschend-plateau', matching the `Entity`
 * stub of the same slug in `raschpetzer-walferdange.ts` used for hover-preview cards), cross-
 * linked back via `link('Raschpëtzer', 'raschpetzer-qanat')` and `link(…, 'raschpetzer-geology')`
 * in the blocks below.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not imported
// from ./mock, ./raschpetzer, ./raschpetzer-geology, nor ./raschpetzer-walferdange) so this
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

// Page locators per data/site.json's `regions[].._prov` map and docs/RASCHPETZER_DATA.md in the
// raschpetzer-model-digital-3d repo — kept as plain page/#page anchors (not a search/highlight
// viewer): opens the vendored PDF directly at the cited page, new tab.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	topography: {
		id: 'c-petschend-topography',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 7, regional topography)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=7`,
	},
	settlements: {
		id: 'c-petschend-settlements',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 6, fig. 2-1 — Roman settlements, catchment areas and the explored qanat conduit)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=6`,
	},
	structure: {
		id: 'c-petschend-structure',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 14, fig. 4-3 — the Pëtschend horst and fault-bounded strata)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=14`,
	},
	romanaqueducts: {
		id: 'c-petschend-romanaqueducts',
		title: 'Walferdange (Lux)',
		publisher: 'romanaqueducts.info',
		url: 'http://www.romanaqueducts.info/aquasite/walferdange/index.html',
	},
	chronicle: {
		id: 'c-petschend-chronicle',
		title: 'Archaeology in Luxembourg: Raschpëtzer Qanat',
		publisher: 'Chronicle.lu',
		url: 'https://www.chronicle.lu/category/history-archaeology/56283-archaeology-in-luxembourg-raschpetzer-qanat',
	},
} satisfies Record<string, Citation>

export const petschendCitations = c

export const petschendArticle: Article = {
	id: 'a-petschend',
	slug: 'petschend-plateau',
	locale: 'en',
	title: 'Pëtschend Plateau',
	summary:
		'The Pëtschend is a sandstone plateau northeast of Helmsange, Walferdange, Luxembourg, roughly 395 m above sea level. Together with the neighbouring Haedchen Depression, some 600 m to its east and lower-lying, its springs form the catchment that fed the Raschpëtzer qanat — the reason the plateau is remembered at all.',
	categories: ['history'],
	infobox: [
		{
			label: 'Landform',
			value: 'Sandstone plateau (horst), adjoining the Haedchen depression',
		},
		{ label: 'Location', value: 'NE of Helmsange, Walferdange, Luxembourg' },
		{ label: 'Elevation — Pëtschend', value: '≈ 395 m a.s.l.' },
		{ label: 'Elevation — Haedchen Depression', value: '≈ 375 m a.s.l., ~600 m to the east' },
		{ label: 'Bedrock', value: 'Luxembourg sandstone (Lias), horst bounded by E–W faults' },
		{ label: 'Named springs', value: 'Op der Rëll (S), Dauvebur (N), Haedchen spring' },
		{ label: 'Feeds', value: "the Raschpëtzer qanat's catchment" },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				b('Pëtschend'),
				t(
					' is a plateau northeast of Helmsange, in the municipality of Walferdange, Luxembourg, ',
				),
				cite('roughly 395 metres above sea level', 'c-petschend-topography'),
				cite(
					', formed of the same hard-rock Luxembourg sandstone horst the Raschpëtzer qanat is cut into',
					'c-petschend-chronicle',
				),
				t('. It matters to the site chiefly as the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					" qanat's catchment: the plateau's own springs, and those of the neighbouring Haedchen Depression, are what the gallery was dug to intercept and carry down to the Alzette valley.",
				),
			),
		},
		{ id: 'h-haedchen', type: 'heading', level: 2, text: 'The Haedchen Depression' },
		{
			id: 'p-haedchen',
			type: 'paragraph',
			runs: p(
				t('Immediately east of the Pëtschend, and '),
				cite(
					'about 600 metres away, lies the Haedchen Depression — a marshy source area roughly 375 metres above sea level, some 20 metres lower than the plateau',
					'c-petschend-topography',
				),
				t(
					'. It is a closely related landform rather than a separate site: the qanat and its two catchments straddle the saddle between the two.',
				),
				cite(
					' Independent surveys of the qanat place its easternmost, uppermost "mother" shaft in this depression',
					'c-petschend-chronicle',
				),
				t(', consistent with the shaft P9 described in the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(" article's own account of the gallery's route."),
			),
		},
		{ id: 'h-springs', type: 'heading', level: 2, text: 'Springs' },
		{
			id: 'p-springs',
			type: 'paragraph',
			runs: p(
				t(
					"The site's published topographic map names three springs in the immediate area: ",
				),
				b('Op der Rëll'),
				t(', south of the plateau; '),
				b('Dauvebur'),
				t(', on its north side; and a third, labelled the '),
				b('Haedchen spring'),
				cite(', within the depression itself', 'c-petschend-settlements'),
				t('. '),
				cite(
					'Op der Rëll and Dauvebur both lie outside the qanat’s own catchment, escaping instead along the fault zones described below',
					'c-petschend-structure',
				),
				t(
					' — Op der Rëll runs at around 220 m³/day and Dauvebur at around 20 m³/day. A further named spring, Geierbierg, feeds the wider regional catchment at roughly 80 m³/day, though the source data does not place it on either landform specifically; ',
				),
				link('the fuller catchment accounting', 'raschpetzer-geology'),
				t(
					' — including how these compare to the qanat’s own ≈180 m³/day — is covered in the geology article rather than repeated here.',
				),
			),
		},
		{ id: 'h-faults', type: 'heading', level: 2, text: 'Fault lines' },
		{
			id: 'p-faults',
			type: 'paragraph',
			runs: p(
				cite(
					'The Pëtschend is a horst, its bedrock bounded north and south by roughly east–west faults along which the strata are re-aligned to a near-vertical dip',
					'c-petschend-structure',
				),
				t(
					'. On the ground, two such traces cross the saddle between the Pëtschend and the Haedchen Depression: the northern one passes close to the Dauvebur spring, the southern one close to both the Op der Rëll spring and the Haedchen spring — ',
				),
				cite(
					'it is along these same fault zones that groundwater escapes the plateau rather than draining into the qanat',
					'c-petschend-structure',
				),
				t('.'),
			),
		},
		{ id: 'h-villa', type: 'heading', level: 2, text: 'The mapped "Villa Romaine" site' },
		{
			id: 'p-villa',
			type: 'paragraph',
			runs: p(
				t('The same topographic map '),
				cite(
					'labels a site at "Am Gaalgen", near the plateau\'s northwest edge and close to the Dauvebur spring, as "Villa Romaine"',
					'c-petschend-settlements',
				),
				t(
					' — a name on a published figure, not a claim this article can independently verify as excavated or surveyed. It is a distinct thing from the ',
				),
				link('Walferdange', 'walferdange'),
				t(
					" article's separately inferred Roman recipient site, which sits downslope to the west in the Alzette valley at the qanat's far end; the two should not be conflated.",
				),
				cite(
					' Independent site surveys separately note undated rampart remains on the Pëtschend, possibly Celtic- or Hallstatt-period, and a probable Neolithic dwelling trace — earlier occupation than the Roman-era qanat, and likewise not something this article treats as confirmed',
					'c-petschend-romanaqueducts',
				),
				t('.'),
			),
		},
		{ id: 'h-role', type: 'heading', level: 2, text: 'Role in the Raschpëtzer qanat' },
		{
			id: 'p-role',
			type: 'paragraph',
			runs: p(
				t('The plateau and its depression are the reason the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' exists where it does: its builders sited the gallery to intercept groundwater collecting here, at the boundary between the sandstone aquifer and the marl beneath it, and carried it downhill to the west. For the stratigraphy and hydrology behind that choice, see ',
				),
				link('Geology and Hydrology of the Pëtschend', 'raschpetzer-geology'),
				t('.'),
			),
		},
	],
	citations: [c.topography, c.settlements, c.structure, c.romanaqueducts, c.chronicle],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: the Pëtschend plateau and Haedchen depression as landforms, from the site SSOT dataset, the 2018 brochure, and independent web corroboration',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
