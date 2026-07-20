/**
 * Real content: a dedicated deep-dive on the August–October 1986 excavation campaign at the
 * Raschpëtzer — the single event that turned two decades of surface work and stalled shaft
 * clearance into direct entry of the qanat gallery itself. Distinct in scope from
 * `raschpetzer-nicolas-kohl.ts` and `raschpetzer-georges-faber.ts` (which are biographies of the
 * two men and only cover the campaign as part of their life stories): this article is about the
 * EVENT — the buildup, the week-by-week fieldwork, the 1–3 October breakthrough, and the
 * immediate aftermath — narrated at the fullest level of detail the sources support.
 *
 * Every specific fact is sourced to the vendored 2018 brochure, pp. 8–10 (the "Chronicle of the
 * excavations" chapter), extracted directly from the PDF with PyMuPDF for this article rather
 * than relied on second-hand from the people articles. That extraction is also the source for
 * the brochure's own words: the exact date (4 August 1986) the excavation firm named only "EFCO"
 * in the brochure began work; the worker's exclamation "Il y a un trou!" on 1 October 1986; and
 * the day-by-day sequence 1–3 October that ends with Nicolas Kohl's first entry into the gallery.
 *
 * On "EFCO": the brochure names the excavation contractor only as "the EFCO company" (p. 9), with
 * no expansion given anywhere in the document. A web search ("EFCO Luxembourg excavation 1986",
 * "EFCO archéologie Luxembourg") turned up no independent record of what the acronym stands for,
 * or any other source describing this firm's 1986 Raschpëtzer work — the only hit anywhere close
 * (a present-day "Efco-Forodia Exploitation Sàrl" registered in Senningerberg) could not be tied
 * to the 1986 contractor and isn't cited here. So this article names the company exactly as the
 * brochure does — "the EFCO company" — and does not guess at what the initials mean.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's (and mock.ts's) tiny inline-run authoring helpers — kept
// separate, not imported, for the same reason raschpetzer.ts doesn't import them from mock.ts:
// no circular dependency on the module that assembles the corpus.
const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Same base-path-prefixing helper as raschpetzer.ts — a citation `url` literal isn't rewritten
 *  by SvelteKit's router, so it needs the GitHub Pages project-subpath prefixed by hand. */
const asset = (path: string): string => `${base}${path}`

// Page locators verified by extracting the vendored brochure PDF directly (PyMuPDF): p.8 = the
// two decades of stalled/interrupted shaft clearance (1964-1985) that preceded the campaign,
// ending with the 1984 ministerial visit and 1985 tender; p.9 = the campaign itself (EFCO starts
// 4 August 1986) through the 1-3 October breakthrough; p.10 = the gallery's measured extent and
// the immediate aftermath (survey, first film, first photographs, the IST engineers joining).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	brochureBuildup: {
		id: 'c-1986-excavation-p8',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 8, the stalled 1964–1985 shaft clearance and the 1984 funding commitment)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=8`,
	},
	brochureCampaign: {
		id: 'c-1986-excavation-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, the August–3 October 1986 campaign and breakthrough)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	brochureAftermath: {
		id: 'c-1986-excavation-p10',
		title: "The Raschpëtzer — A Roman Underground Water Supply System (p. 10, the gallery's extent and the immediate aftermath)",
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
} satisfies Record<string, Citation>

export const excavation1986Citations = c

export const excavation1986Article: Article = {
	id: 'a-1986-excavation',
	slug: '1986-excavation',
	locale: 'en',
	title: 'The 1986 Excavation',
	summary:
		'Between August and October 1986, a resumed excavation of shaft P5 at the Raschpëtzer broke through into the qanat gallery itself — the single most pivotal event in the site’s modern history. On 3 October 1986, after a worker’s spade opened a hole two days earlier, Nicolas Kohl became the first person to enter the gallery in nearly two thousand years, confirming Georges Faber’s two-decade-old hypothesis that the Raschpëtzer was a Roman aqueduct.',
	categories: ['archaeology', 'history'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat lay undiscovered as a functioning gallery for almost twenty years after its first partial shafts were reopened, until a five-month excavation campaign in the autumn of 1986 broke through into the conduit itself. The campaign was led on the ground by ',
				),
				link('Georges Faber', 'georges-faber'),
				t(' and '),
				link('Nicolas Kohl', 'nicolas-kohl'),
				t(
					', the two amateur researchers who had driven the investigation since a chance meeting twenty years earlier, and it ended, on 3 October 1986, with Kohl climbing down 35 metres and becoming the first human being to set foot in the gallery since Roman times.',
				),
			),
		},
		{ id: 'h-buildup', type: 'heading', level: 2, text: 'Two decades to get there' },
		{
			id: 'p-buildup',
			type: 'paragraph',
			runs: p(
				cite(
					'The path to 1986 began in 1964, when speleologists of the Groupe Spéléologique Luxembourgeois descended into shafts P1 and P5 and found both still open, to depths of 7 and 10 metres respectively',
					'c-1986-excavation-p8',
				),
				t(
					', prompting Georges Faber to draft a manuscript on everything then known about the Raschpëtzer, which he presented to Nicolas Kohl in 1966 — the meeting that started the "Faber-Kohl duo".',
				),
				cite(
					' In the summer of 1967 the GSL resumed clearing P5 by hand, with only a manually controlled rope winch, reaching 23 metres before conditions forced a stop; well-drilling contractors hired by SIT Walferdange pushed the same shaft to 25.5 metres between 1968 and 1970, but a lack of funds for more capable equipment then halted work entirely until 1986',
					'c-1986-excavation-p8',
				),
				t('.'),
			),
		},
		{
			id: 'p-buildup-2',
			type: 'paragraph',
			runs: p(
				cite(
					'Through the interim, SIT Walferdange kept the site alive with publications and conferences aimed at the public and the authorities, a campaign that paid off in 1984 when Robert Krieps, Minister of Culture, and Pierre Werner, Honorary Prime Minister, visited the Raschpëtzer together with representatives of the Ministry for Tourism, the National Museum, and the Municipality of Walferdange',
					'c-1986-excavation-p8',
				),
				t(
					'. Georges Faber presented a newly compiled manuscript on that visit, and the Minister of Culture committed financial support for resuming excavation. ',
				),
				cite(
					'An expert group formed in 1985 accepted a tender offer from an excavation firm and worked through the administrative procedures needed before digging could restart',
					'c-1986-excavation-p8',
				),
				t(' — clearing the way for the campaign that opened the gallery a year later.'),
			),
		},
		{ id: 'h-campaign', type: 'heading', level: 2, text: 'The campaign, August–October 1986' },
		{
			id: 'p-campaign',
			type: 'paragraph',
			runs: p(
				cite(
					'Excavation of shaft P5 resumed in August 1986; the EFCO company started its work on 4 August',
					'c-1986-excavation-p9',
				),
				t(
					' — the brochure names the contractor only as "the EFCO company", with no expansion of the initials given anywhere in the document, and no independent record of the firm or the acronym’s meaning could be found for this article. ',
				),
				cite(
					'Faber and Kohl formed the supervision team that stayed on site throughout, monitoring progress, examining excavated material, keeping records, and compiling photographic and film documentation',
					'c-1986-excavation-p9',
				),
				t('. '),
				cite(
					'Below them, a worker spent day after day in a confined space at the bottom of the shaft, filling bucket after bucket with muddy excavation spoil, while a colleague topside hauled each bucket up with an electrical rope winch',
					'c-1986-excavation-p9',
				),
				t('.'),
			),
		},
		{
			id: 'h-breakthrough',
			type: 'heading',
			level: 2,
			text: '"Il y a un trou!" — three days in October',
		},
		{
			id: 'p-breakthrough-1',
			type: 'paragraph',
			runs: p(
				cite(
					'In the late afternoon of 1 October 1986, an unforgettable exclamation rose from the bottom of shaft P5: "Il y a un trou!" — "There is a hole!"',
					'c-1986-excavation-p9',
				),
				t(
					' Near the eastern shaft wall, the worker’s spade had broken through into a small opening, and the sludge, diluted by seepage water, began draining away through it. ',
				),
				cite(
					'On the following day, 2 October, the crew excavated further at the bottom of the shaft until a gallery came into view',
					'c-1986-excavation-p9',
				),
				t('.'),
			),
		},
		{
			id: 'p-breakthrough-2',
			type: 'paragraph',
			runs: p(
				cite(
					'On 3 October 1986, the base of the shaft was reached at a depth of 35 metres and access was gained to the gallery — Nicolas Kohl was the first human being in nearly 2,000 years to enter it',
					'c-1986-excavation-p9',
				),
				t(
					'. The gallery floor was covered with dry, clean sandstone ballast that shone golden yellow under torchlight. ',
				),
				cite(
					'Georges Faber’s two-decade-old assumption that this was the gallery of a Roman qanat was confirmed once some of the ballast was carefully cleared away and one of the underlying sandstone slabs was lifted, revealing a narrow channel of clear water flowing east to west, from the Pëtschend plateau toward the Alzette valley',
					'c-1986-excavation-p9',
				),
				t('.'),
			),
		},
		{ id: 'h-extent', type: 'heading', level: 2, text: "The gallery's first-measured extent" },
		{
			id: 'p-extent',
			type: 'paragraph',
			runs: p(
				cite(
					'From P5, the newly opened gallery ran 26 metres to the east before it was blocked by a debris cone of iron-oxide-bearing sinter, with a sand wall piled up partway along its middle stretch',
					'c-1986-excavation-p9',
				),
				t('. '),
				cite(
					'To the west it ran a further 35 metres, ending at a cone of fine yellow sand spilling down from the crown at the location of shaft P4',
					'c-1986-excavation-p10',
				),
				t(
					' — the two blockages that would themselves become the next targets, tunnelled through and cleared over the following years.',
				),
			),
		},
		{ id: 'h-aftermath', type: 'heading', level: 2, text: 'Immediate aftermath' },
		{
			id: 'p-aftermath',
			type: 'paragraph',
			runs: p(
				cite(
					'After more than 20 years of hopes and disappointments, the Raschpëtzer pioneers Faber and Kohl had uncovered the secret of the legendary Raschpëtzer, and the aqueduct hypothesis first put forward in Faber’s 1966 manuscript was definitively confirmed',
					'c-1986-excavation-p10',
				),
				t('. '),
				cite(
					'In the days that followed, Georges Faber surveyed the newly discovered gallery segment between shafts P4 and P6, Nicolas Kohl produced the first cine film of the find, and Sonja Faber shot the first photographs',
					'c-1986-excavation-p10',
				),
				t('. '),
				cite(
					'Later that same year, two civil engineers and land surveyors from the Institut Supérieur de Technologie (now the University of Luxembourg) joined the team, bringing the technical know-how and equipment needed to push the exploration further and to begin clarifying where the qanat’s water came from and where it was ultimately headed',
					'c-1986-excavation-p10',
				),
				t(
					' — work that would occupy the research team for another decade and a half, but that only became possible once the gallery itself had, on 3 October 1986, finally been entered.',
				),
			),
		},
	],
	citations: [c.brochureBuildup, c.brochureCampaign, c.brochureAftermath],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: a dedicated narrative of the August–October 1986 excavation campaign, extracted directly from the vendored brochure PDF (pp. 8–10)',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
