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
 * `data/shafts.json`'s `P2.geoConfidence` is `"low"`, per paradata entry `pd-osm-georef` in
 * `docs/RASCHPETZER_DATA.md`: the brochure carries no coordinate grid on any figure, so the
 * model's plotted coordinate for P2 is a provisional OpenStreetMap-derived position that
 * conflicts with the brochure's own documented spacing (see the callout below). That
 * uncertainty is a real, documented property of the source data, not an editorial guess —
 * it is reported here rather than presented as a settled position.
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
	/** Not the brochure/model — a 1997 field survey plan, and Werner's 2026 re-measurement
	 *  of it, both proposed as a candidate fix for the low-confidence flag below. Neither has
	 *  been adopted into the site's 3D model yet, so both are cited separately from (and kept
	 *  clearly distinct in tone from) the brochure citations above. */
	wernerPlan1997: {
		id: 'c-shaft-p2-werner-1997-plan',
		title: '1997 contour-survey plan of the western Raschpëtzer shafts (P-7A to P2), annotated "WG 2/97"',
		authors: 'Waringo, Guy (survey, Feb. 1997)',
		year: 1997,
		publisher:
			'Shared by Henri Werner in an email to the Raschpëtzer research group, 21 July 2026',
		url: asset('/sources/raschpetzer-werner-1997-plan.pdf'),
	},
	wernerCoords1997: {
		id: 'c-shaft-p2-werner-1997-coords',
		title: 'LUREF (Gauss-Luxembourg) coordinates for shafts P-7A, P-5A, P-4, P-1, P0, P1, and P2, re-measured from the 1997 plan',
		authors: 'Werner, Henri',
		year: 2026,
		publisher:
			'Proposed by Henri Werner in an email to the Raschpëtzer research group, 21 July 2026',
		url: asset('/sources/raschpetzer-werner-1997-coordinates.pdf'),
	},
} satisfies Record<string, Citation>

export const shaftP2Citations = c

export const shaftP2Article: Article = {
	id: 'a-shaft-p2',
	slug: 'shaft-p2',
	locale: 'en',
	title: 'Shaft P2',
	summary:
		"Shaft P2 of the Raschpëtzer qanat sits at the western edge of the Pëtschend plateau, in visual contact with shaft P1 to its west and, across the plateau, shaft P5 to its east — a sightline requirement that also explains its unusually tight spacing to P1. It is still backfilled in its original state, and the coordinate plotted for it in the site's 3D model carries a documented low-confidence flag.",
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
			variant: 'warning',
			title: 'Plotted position: low confidence',
			runs: p(
				t(
					"The 2018 brochure's own figures carry no coordinate grid — its only positional plate is an oblique 3D block model with a scale bar, not a survey plan — so no real-world (WGS84) position for any shaft can be read directly from it. The site's 3D model instead plots a provisional coordinate for P2 from an OpenStreetMap trace, and that trace is flagged low confidence specifically for P2: it puts the P1–P2 gap as the longer of the two legs either side of P2, the opposite of what the brochure describes, and its P2–P3 gap falls well short of the documented 28 metres. P2's existence, description, and its unusually close spacing to P1 are firmly documented in the brochure text; only the precise coordinate plotted for it on the map is uncertain, pending a certified survey plan.",
				),
			),
		},
		{
			id: 'callout-werner-proposal',
			type: 'callout',
			variant: 'info',
			title: 'A candidate correction has been proposed',
			runs: p(
				t('On 21 July 2026, '),
				b('Henri Werner'),
				cite(
					' proposed a fix for this uncertainty in an email to the Raschpëtzer research group: LUREF (Gauss-Luxembourg) coordinates for P2 and six neighbouring western shafts — P-7A, P-5A, P-4, P-1, P0, and P1 — re-measured directly from a real 1997 contour-survey plan of the site',
					'c-shaft-p2-werner-1997-coords',
				),
				t(', rather than read off the OpenStreetMap trace described above. '),
				cite(
					'The re-measured values for P0 and P1 closely matched an independent set of figures Guy Waringo had supplied the day before',
					'c-shaft-p2-werner-1997-coords',
				),
				t(
					" — a real cross-check, not a single unverified reading. This is a strong candidate for resolving the low-confidence flag above, though it remains a hand-measured reading from a scanned plan rather than a certified survey, and the site's 3D model has not yet been updated to incorporate it.",
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
	citations: [c.position, c.survey, c.state, c.p1, c.p3, c.wernerPlan1997, c.wernerCoords1997],
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
				'Added Henri Werner’s proposed 1997-plan LUREF re-measurement as a candidate fix for the low-confidence P2 position',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 22),
	contributors: ['raschpetzer-model-digital-3d SSOT', 'user-supplied'],
}
