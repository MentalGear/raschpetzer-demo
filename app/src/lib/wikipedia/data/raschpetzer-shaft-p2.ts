/**
 * Real content: a standalone deep-dive on shaft P2 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg) — a companion sub-article to `./raschpetzer.ts` and `./raschpetzer-shafts.ts`.
 * See `raschpetzer.ts`'s header for the source repo (`raschpetzer-model-digital-3d`:
 * `data/shafts.json`'s "P2" record, `docs/RASCHPETZER_DATA.md`) and the primary-source
 * brochure it cites (vendored at `static/sources/`). Every specific fact/number carries its
 * own adjacent citation. Page locators come from `data/shafts.json`'s `P2._prov.notes.loc`
 * field (p. 17; fig. 5-4) and `docs/RASCHPETZER_DATA.md`'s "Shaft notes" list.
 *
 * `P2` (this shaft, documented, backfilled) is easy to confuse with the postulated shaft
 * `P-2` (hyphenated, inferred/unlocated, west of P-4 — see `./raschpetzer-postulated-shafts.ts`)
 * — the site's own numbering carries that ambiguity, so it's called out explicitly below
 * rather than left for the reader to trip over.
 *
 * `data/shafts.json`'s `P2` position was originally a low-confidence, OpenStreetMap-derived
 * guess (per paradata entry `pd-osm-georef`) that conflicted with the brochure's own
 * documented spacing. As of 20 July 2026 that has been resolved: the companion 3D model's
 * `pd-werner-sit-survey` paradata entry documents a real field-survey coordinate table for
 * the main-line shafts, provided directly to that project by Henri Werner (who sent the
 * files but is not necessarily the original surveying party) and converted to WGS84
 * (pyproj, EPSG:2169→4326) — see the callout below for the resulting correction. This
 * article previously described that fix as still "proposed" from a separate, less precise
 * re-measurement Werner supplied by email; that framing was itself corrected here once the
 * actual companion-repo state was checked directly, rather than left stale.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `P2._prov.notes.loc` /
// `P1._prov.loc` / `P3._prov.loc` fields and docs/RASCHPETZER_DATA.md's "Shaft notes" list —
// plain page/#page anchors into the vendored PDF, opened new tab (same pattern as
// raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	position: {
		id: 'c-shaft-p2-p17-position',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17, fig. 5-4 — shaft P2, position and visual contact with P1/P5)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	survey: {
		id: 'c-shaft-p2-p17-survey',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17 — shaft P2, proximity to P1 explained by surveying considerations)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	state: {
		id: 'c-shaft-p2-p17-state',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17–18 — shaft P2, backfilled original state; unexplored gallery to P3)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	p1: {
		id: 'c-shaft-p2-p16-p1',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 16 — shaft P1, depth and the intermediate sounding gallery)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=16`,
	},
	p3: {
		id: 'c-shaft-p2-p17-p3',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 17 — shaft P3, distance from P2, depth, and position on the P1–P5 line)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
	/** The companion 3D model's own established citation for this fix (its `pd-werner-sit-
	 *  survey` paradata entry / `data/sources.json`'s `werner-sit-survey` entry) — an
	 *  unpublished working document, not redistributed here, so (like the Kohl manuscript
	 *  citation elsewhere in this corpus) this carries no `url`, matching the no-URL pattern
	 *  already used for other internal-SSOT-only citations (e.g. `raschpetzer-gallery.ts`'s
	 *  `c-gallery-survey-outlet`). */
	wernerSitSurvey: {
		id: 'c-shaft-p2-werner-sit-survey',
		title: 'Coordonnées Raschpëtzer — surveyed shaft coordinates, LUREF/LTM (EPSG:2169)',
		authors: 'Werner, Henri',
		publisher:
			'Companion GIS/3D model dataset (data/shafts.json, docs/DATA_CREDIBILITY.md) — provided directly by Henri Werner, who is not necessarily the original surveying party',
	},
} satisfies Record<string, Citation>

export const shaftP2Citations = c

export const shaftP2Article: Article = {
	id: 'a-shaft-p2',
	slug: 'shaft-p2',
	locale: 'en',
	title: 'Shaft P2',
	summary:
		'Shaft P2 of the Raschpëtzer qanat sits at the western edge of the Pëtschend plateau, in visual contact with shaft P1 to its west and, across the plateau, shaft P5 to its east — a sightline requirement that also explains its unusually tight spacing to P1. It is still backfilled in its original state; its plotted position, once a low-confidence OpenStreetMap guess, was resolved by a real field survey in July 2026.',
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('P2'),
				t(' is a shaft of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					', a Gallo-Roman qanat near Walferdange, Luxembourg. It appears only briefly in the ',
				),
				link('shaft inventory', 'raschpetzer-shafts'),
				cite(
					"; this article gathers what the 2018 brochure documents about P2 on its own: its position at the plateau's western edge,",
					'c-shaft-p2-p17-position',
				),
				cite(
					' its unusually small distance to neighbouring shaft P1,',
					'c-shaft-p2-p17-survey',
				),
				t(' and its current, still-backfilled state.'),
			),
		},
		{
			id: 'h-position',
			type: 'heading',
			level: 2,
			text: "Position at the plateau's western edge",
		},
		{
			id: 'p-position',
			type: 'paragraph',
			runs: p(
				cite(
					'P2 is located at the western edge of the Pëtschend plateau and has visual contact with shaft P1 and, eastwards across the plateau, with shaft P5 on its opposite edge.',
					'c-shaft-p2-p17-position',
				),
				t(' Shaft '),
				cite(
					'P3 sits 28 metres east of P2, exactly on the straight survey line running from P1 to P5',
					'c-shaft-p2-p17-p3',
				),
				t(
					' — a line that crosses the plateau at its narrowest point, letting the builders keep as many of the plateau shafts as possible under 30 metres deep. Together, P2, P3, P4, and P5 make up the four shafts on the Pëtschend plateau.',
				),
			),
		},
		{
			id: 'callout-georef',
			type: 'callout',
			variant: 'info',
			title: 'Plotted position: resolved via field survey (updated 20 July 2026)',
			runs: p(
				t(
					"The 2018 brochure's own figures carry no coordinate grid — its only positional plate is an oblique 3D block model with a scale bar, not a survey plan — so no real-world (WGS84) position for any shaft could be read directly from it. The site's 3D model originally plotted a provisional coordinate for P2 from an OpenStreetMap trace, and that trace was flagged low confidence specifically for P2: it put the P1–P2 gap as the longer of the two legs either side of P2, the opposite of what the brochure describes, and its P2–P3 gap fell well short of the documented 28 metres. ",
				),
				cite(
					'Since 20 July 2026, a real field-survey coordinate table for the main-line shafts — provided directly to the companion 3D model by Henri Werner, who sent the files but is not necessarily the original surveying party — has superseded that guess',
					'c-shaft-p2-werner-sit-survey',
				),
				t(
					' — the correction moved P2 by 10.9 metres, closely matching this reconciliation’s own suspicion that the OSM node read roughly a third too far east, and the resulting P2–P3 distance (28.75 m) now matches the documented 28 metres almost exactly. P2’s existence, description, and its unusually close spacing to P1 were always firmly documented in the brochure text; only the precise coordinate was ever in question, and that question is now settled by survey rather than left pending.',
				),
			),
		},
		{ id: 'h-survey', type: 'heading', level: 2, text: 'Why P2 sits so close to P1' },
		{
			id: 'p-survey',
			type: 'paragraph',
			runs: p(
				t(
					'P1, at the bend in the route, was of key importance to the builders for staking out the rest of the shaft line: from its head, the view reaches downstream to the northwest as far as the auxiliary shafts P-5 and P-7A, and upstream to the plateau edge above. ',
				),
				cite(
					"P2's unusually small distance to P1 can be explained by these same surveying considerations",
					'c-shaft-p2-p17-survey',
				),
				t(
					' — P2 needed a direct sightline to P1 on one side and, across the plateau, to P5 on the other, and that dual requirement placed it closer to P1 than the regular shaft-spacing pattern elsewhere on the route would otherwise suggest.',
				),
			),
		},
		{
			id: 'callout-naming',
			type: 'callout',
			variant: 'note',
			title: 'Not to be confused with postulated shaft P-2',
			runs: p(
				t(
					"This shaft, P2 (no hyphen), is documented, backfilled, and physically located, as described above. It is easy to confuse with the separate, unrelated postulated shaft P-2 (hyphenated) — one of three shaft positions (with P-3 and P-6A) inferred purely from spacing regularity west of shaft P-4, never located or excavated. The two share almost the same label by coincidence of the site's own numbering scheme, not because they are the same shaft.",
				),
			),
		},
		{ id: 'h-state', type: 'heading', level: 2, text: 'Current state: still backfilled' },
		{
			id: 'p-state',
			type: 'paragraph',
			runs: p(
				cite(
					'P2 is still backfilled in its original state, with an excavation cone visible in the surface terrain above and a dumping cone at the bottom of the open gallery reached from P1.',
					'c-shaft-p2-p17-state',
				),
				t(
					" Whether P2 connects to P1's upper, unchanneled 'sounding' gallery has not been clarified. ",
				),
				cite(
					'The gallery section between P2 and P3 has never been accessed since construction and is presumed open, like the neighbouring sections, though there is not enough clearance to pass a tunnel beneath either shaft to confirm it.',
					'c-shaft-p2-p17-state',
				),
			),
		},
		{ id: 'h-neighbours', type: 'heading', level: 2, text: 'Neighbouring shafts: P1 and P3' },
		{
			id: 'p-neighbours',
			type: 'paragraph',
			runs: p(
				b('P1'),
				t(
					', immediately west, sits at the bend in the route about 6 metres below the plateau edge in a natural depression and is thought to have been the first shaft sunk; ',
				),
				cite(
					"its total depth is 30 metres, with an unchanneled intermediate 'sounding' gallery cut at 20 metres to test the ground before the final depth was reached",
					'c-shaft-p2-p16-p1',
				),
				t('. '),
				b('P3'),
				t(', 28 metres east of P2 on the straight P1–P5 line, '),
				cite(
					'is 35 metres deep and, like P2, is still in its original, unexcavated state',
					'c-shaft-p2-p17-p3',
				),
				t('. For the full shaft-by-shaft inventory, see '),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t('; for the qanat as a whole, see '),
				link('Raschpëtzer Qanat', 'raschpetzer-qanat'),
				t('.'),
			),
		},
	],
	citations: [c.position, c.survey, c.state, c.p1, c.p3, c.wernerSitSurvey],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft from the site SSOT dataset (data/shafts.json) and the 2018 brochure',
			blocks: [],
		},
		{
			id: 'r2',
			author: 'user-supplied',
			ts: Date.UTC(2026, 6, 22),
			summary:
				'Added Henri Werner’s separately-supplied 1997-plan LUREF re-measurement as a candidate fix for the low-confidence P2 position',
			blocks: [],
		},
		{
			id: 'r3',
			author: 'user-supplied',
			ts: Date.UTC(2026, 6, 23),
			summary:
				'Corrected: the companion 3D model had already resolved this position on 20 July 2026, via a real field-survey table (not the separate re-measurement r2 described) — rewrote the callout to reflect the actual, already-adopted state',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 23),
	contributors: ['raschpetzer-model-digital-3d SSOT', 'user-supplied'],
}
