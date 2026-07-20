/**
 * Real content: a standalone deep-dive on shaft P8 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg) — famous as the source of the oak beam whose tree rings supply the site's
 * only absolute construction date. A companion sub-article to `./raschpetzer.ts` (which
 * covers the dating find briefly, in the site-wide "Dating" section) and `./raschpetzer-
 * shafts.ts` (which covers P8 briefly, alongside the other 17 shaft records) — see those
 * files' headers for the source repo (`raschpetzer-model-digital-3d`: `data/shafts.json`,
 * `docs/RASCHPETZER_DATA.md`) and the primary-source brochure they cite (vendored at
 * `static/sources/`). This article goes deeper: the excavation of P8 itself, the spring
 * inflow beside it, and — the main subject — the dendrochronology of the oak beam, with
 * real technical background on tree-ring dating drawn from external, web-researched
 * sources. Every specific fact/number carries its own adjacent citation.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.notes.loc` /
// docs/RASCHPETZER_DATA.md's "Shaft notes" entry for P8 — cross-checked directly against
// the vendored brochure PDF (pp. 10, 19, 26, 28–29). Plain page/#page anchors into the
// vendored PDF, opened new tab (same pattern as raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
// The dendrochronology background citations below are external, web-researched sources —
// real URLs, not the brochure.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	discovery: {
		id: 'c-shaft-p8-p10',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10 — oak beam found in P8 during the 1986–1991 eastward campaign)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	cleared: {
		id: 'c-shaft-p8-p19',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 19 — P8 cleared without problems)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=19`,
	},
	counterExcavation: {
		id: 'c-shaft-p8-p26',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 26, fig. 5-20 — the counter-excavation between P7 and P8)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=26`,
	},
	springInflow: {
		id: 'c-shaft-p8-p28',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 28 — spring inflow 2 m upstream of P8)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=28`,
	},
	oakBeam: {
		id: 'c-shaft-p8-p29',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 29, fig. 5-27 — the oak beam: Landesmuseum Trier dendrochronology, outer ring AD 114, felling AD 131)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=29`,
	},
	dendroOverview: {
		id: 'c-shaft-p8-dendro-wiki',
		title: 'Dendrochronology',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Dendrochronology',
	},
	crossdating: {
		id: 'c-shaft-p8-crossdating',
		title: 'Crossdating — The Basic Principle of Dendrochronology',
		publisher: 'Laboratory of Tree-Ring Research, University of Arizona',
		url: 'https://www.ltrr.arizona.edu/lorim/basic.html',
	},
	fellingDates: {
		id: 'c-shaft-p8-felling',
		title: 'Tree-ring dating and estimating felling dates of historical timbers (fellingdater)',
		publisher: 'rOpenSci',
		url: 'https://docs.ropensci.org/fellingdater/',
	},
	hohenheimChronology: {
		id: 'c-shaft-p8-hohenheim',
		title: 'The 12,460-Year Hohenheim Oak and Pine Tree-Ring Chronology from Central Europe',
		publisher: 'Radiocarbon (Cambridge University Press)',
		url: 'https://www.cambridge.org/core/journals/radiocarbon/article/12460year-hohenheim-oak-and-pine-treering-chronology-from-central-europea-unique-annual-record-for-radiocarbon-calibration-and-paleoenvironment-reconstructions/41104F23F7389472787A965C7AD6D702',
	},
	landesmuseum: {
		id: 'c-shaft-p8-landesmuseum',
		title: 'Rheinisches Landesmuseum Trier',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Rheinisches_Landesmuseum_Trier',
	},
	portaNigra: {
		id: 'c-shaft-p8-porta-nigra',
		title: 'Precise date of Porta Nigra in Trier identified',
		publisher: 'The History Blog',
		year: 2020,
		url: 'http://www.thehistoryblog.com/archives/50177',
	},
} satisfies Record<string, Citation>

export const shaftP8Citations = c

export const shaftP8Article: Article = {
	id: 'a-shaft-p8',
	slug: 'shaft-p8',
	locale: 'en',
	title: 'Shaft P8',
	summary:
		"Shaft P8, on the eastern leg of the Raschpëtzer qanat, is where excavators recovered the oak beam whose tree rings supply the site's only absolute construction date — an outer ring dated to AD 114 and an extrapolated felling year around AD 131, determined by dendrochronology at the Landesmuseum in Trier.",
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Shaft '),
				b('P8'),
				t(' is one of the main shafts on the eastern leg of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(" qanat, sunk between P7 and the 'mother shaft' P9 in the Haedchen depression. "),
				cite(
					'It was cleared without any problems, in accordance with established excavation practices',
					'c-shaft-p8-p19',
				),
				t(
					" — but it is best known for a single find near its base: an oak beam whose growth rings supply the qanat's only absolute construction date. For the full shaft inventory, see ",
				),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t('.'),
			),
		},
		{
			id: 'h-excavation',
			type: 'heading',
			level: 2,
			text: 'Excavation: a counter-excavation with P7',
		},
		{
			id: 'p-excavation',
			type: 'paragraph',
			runs: p(
				cite(
					'P8 was reached from below ground during the 1986–1991 campaign that explored the gallery eastward from the Pëtschend plateau into the Haedchen depression',
					'c-shaft-p8-p10',
				),
				t(
					'. Most of the route was driven eastward, shaft to shaft, so that spoil and water alike drained downhill toward the working face — but ',
				),
				cite(
					'the stretch between P7 and P8 was the one exception: it was excavated by the counter-excavation method, with two teams tunnelling simultaneously from opposite ends and meeting in the middle',
					'c-shaft-p8-p26',
				),
				t('. '),
				cite(
					'Each start was well aligned to the survey axis, but the two headings met with an offset of about half a gallery width, and the offset edges were simply bevelled down at the join',
					'c-shaft-p8-p26',
				),
				t('.'),
			),
		},
		{ id: 'h-inflow', type: 'heading', level: 2, text: 'The spring inflow' },
		{
			id: 'p-inflow',
			type: 'paragraph',
			runs: p(
				cite(
					'A spring enters the gallery about 2 metres upstream of P8, on the left-hand wall, flowing out of a fist-sized fissure at an estimated rate of roughly 25 cubic metres a day',
					'c-shaft-p8-p28',
				),
				t(
					' — one of several such natural inflows along the sandstone stretch of the gallery east of P5, where water seeps in from fissures above the sandstone–marl interface rather than through the stone-covered channel itself.',
				),
			),
		},
		{
			id: 'h-dating',
			type: 'heading',
			level: 2,
			text: 'The oak beam: a dendrochronological date for the qanat',
		},
		{
			id: 'p-dating-find',
			type: 'paragraph',
			runs: p(
				cite(
					'Almost at the bottom of P8, firmly embedded in the backfill, excavators found part of a wooden beam bearing rope rubbing marks',
					'c-shaft-p8-p29',
				),
				t(" (illustrated in the brochure's fig. 5-27). "),
				cite(
					'The beam was analysed dendrochronologically at the Landesmuseum in Trier, Germany, against the central European oak chronology',
					'c-shaft-p8-p29',
				),
				t('. '),
				cite(
					'The outer surviving ring of the sample dated to AD 114; the extrapolated probable year of felling was AD 131',
					'c-shaft-p8-p29',
				),
				t('.'),
			),
		},
		{ id: 'h-method', type: 'heading', level: 3, text: 'How tree-ring dating works' },
		{
			id: 'p-method-crossdating',
			type: 'paragraph',
			runs: p(
				cite(
					'Dendrochronology dates wood to the calendar year by matching its ring-width pattern against a master chronology — a reference sequence built by overlapping the ring patterns of many timbers, old and modern, back through time',
					'c-shaft-p8-dendro-wiki',
				),
				t(
					'. Because year-to-year growth is driven largely by shared climate conditions, trees of the same species growing in the same region lay down a broadly matching sequence of wide and narrow rings; ',
				),
				cite(
					"finding the one position where an unknown sample's ring pattern lines up against the reference sequence — crossdating — is the technique's basic operating principle",
					'c-shaft-p8-crossdating',
				),
				t('. '),
				cite(
					'Oak is especially well suited to the method: it is long-lived, sensitive to annual conditions, resistant to decay, and, in central Europe, backed by reference chronologies that in places extend continuously across more than 12,000 years',
					'c-shaft-p8-hohenheim',
				),
				t(
					', so a well-preserved sample can often be matched to within a single calendar year.',
				),
			),
		},
		{
			id: 'p-method-felling',
			type: 'paragraph',
			runs: p(
				t('A dated ring is not automatically a felling date. '),
				cite(
					"A living oak's outermost rings — its sapwood — are structurally distinct from the heartwood beneath, and they are also the rings most easily lost to decay, trimming, or working of the timber before it reaches an archaeological context",
					'c-shaft-p8-felling',
				),
				t(
					"; if a sample's outer surviving ring is heartwood rather than the true felling surface, as at P8, the felling date has to be estimated by adding back the typical number of missing sapwood rings — ",
				),
				cite(
					'a range that regional statistical models put at roughly 11 to 41 rings for 95% of oaks in this part of Europe',
					'c-shaft-p8-felling',
				),
				t(
					". The Raschpëtzer beam's AD 131 felling estimate — seventeen years after its dated outer ring of AD 114 — sits comfortably inside that range, which is why the brochure reports it as an extrapolation rather than a direct reading of the bark edge.",
				),
			),
		},
		{ id: 'h-parallel', type: 'heading', level: 3, text: 'The same laboratory, the same city' },
		{
			id: 'p-parallel',
			type: 'paragraph',
			runs: p(
				cite(
					"The Landesmuseum in Trier that dated the Raschpëtzer beam — now the Rheinisches Landesmuseum Trier — runs one of the region's established dendrochronology laboratories",
					'c-shaft-p8-landesmuseum',
				),
				t(
					', and has since produced tree-ring dates for other Roman-era timber in the city: ',
				),
				cite(
					"a later dating campaign by the same museum placed oak piles under the foundations of Trier's Porta Nigra city gate to the winter of AD 169/170",
					'c-shaft-p8-porta-nigra',
				),
				t(
					', using the same crossdating method against the same regional oak chronology as the Raschpëtzer beam decades earlier.',
				),
			),
		},
		{ id: 'h-significance', type: 'heading', level: 2, text: 'Why the date matters' },
		{
			id: 'p-significance',
			type: 'paragraph',
			runs: p(
				t(
					"A felling date is not, on its own, a construction date — but oak used in underground structural work of this kind was generally put to use soon after felling, so the beam's ",
				),
				cite(
					"AD 131 estimate is treated as anchoring the qanat's construction to the early-to-mid 2nd century AD",
					'c-shaft-p8-p29',
				),
				t(', the only absolute date recovered anywhere along the gallery. See the '),
				link('Raschpëtzer Qanat', 'raschpetzer-qanat'),
				t(
					" article's Dating section for how this single find fits into the site's overall chronology, and ",
				),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t(" for how P8 compares with the qanat's other seventeen shaft records."),
			),
		},
	],
	citations: [
		c.discovery,
		c.cleared,
		c.counterExcavation,
		c.springInflow,
		c.oakBeam,
		c.dendroOverview,
		c.crossdating,
		c.fellingDates,
		c.hohenheimChronology,
		c.landesmuseum,
		c.portaNigra,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft: deep-dive on shaft P8 from the site SSOT dataset (data/shafts.json), the 2018 brochure, and web-researched dendrochronology background',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
