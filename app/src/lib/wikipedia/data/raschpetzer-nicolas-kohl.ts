/**
 * Real content: Nicolas Kohl, co-founder (with Georges Faber) of the Raschpëtzer research
 * effort. Not previously covered by this wiki — found via a targeted web search prompted by
 * the task brief, then confirmed as the central figure he is by re-reading the vendored 2018
 * brochure PDF directly (pp. 8–10, 37–38 all name him; the existing `raschpetzer-people.ts`
 * had already picked up his name once in passing, as a co-author credit on SIT Walferdange's
 * publications page, without following up on who he was). Every biographical/narrative claim
 * below is cited: brochure-derived facts deep-link into the vendored PDF (`#page=N`, verified
 * by extracting those pages directly with PyMuPDF); the personal-biography facts (birth/death
 * dates, profession) come from the Luxembourgish-language Wikipedia article about him, the one
 * independent source found for those details — no fact here is invented or extrapolated beyond
 * what these sources state.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's (and mock.ts's) tiny inline-run authoring helpers — kept
// separate, not imported, for the same reason raschpetzer.ts/raschpetzer-people.ts don't
// import them from mock.ts: no circular dependency on the module that assembles the corpus.
const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Same base-path-prefixing helper as raschpetzer.ts/raschpetzer-people.ts — a citation `url`
 *  literal isn't rewritten by SvelteKit's router, so it needs the GitHub Pages project-subpath
 *  prefixed by hand. */
const asset = (path: string): string => `${base}${path}`

// Page locators verified by extracting the vendored brochure PDF directly (PyMuPDF): p.8-9 =
// the 1966 meeting and the "Faber-Kohl duo" that led the research until 1986; p.9-10 = the
// August-October 1986 excavation and breakthrough, where Kohl is named as the first person to
// enter the gallery; p.37 = acknowledgements, crediting Faber and Kohl as the two private
// individuals whose initiative started the whole investigation; p.38 = bibliography, listing
// Kohl's own and co-authored publications.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	brochureMeeting: {
		id: 'c-nicolas-kohl-brochure-p8',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 8, the 1966 meeting and the Faber–Kohl partnership)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=8`,
	},
	brochureExcavation1986: {
		id: 'c-nicolas-kohl-brochure-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, the August–3 October 1986 excavation and breakthrough)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	brochurePhotoCaptions: {
		id: 'c-nicolas-kohl-brochure-p10',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10, fig. 3-9/3-10 photo captions and the first film/photographs)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	brochureAcknowledgements: {
		id: 'c-nicolas-kohl-brochure-p37',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 37, acknowledgements: the two founding individuals, and help preparing the brochure)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=37`,
	},
	brochureBibliography: {
		id: 'c-nicolas-kohl-brochure-p38',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 38, bibliography)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=38`,
	},
	sitWalferPublications: {
		id: 'c-nicolas-kohl-sitwalfer-publications',
		title: 'Publications',
		publisher: "Syndicat d'initiative et de tourisme (SIT) Walferdange",
		url: 'https://www.sitwalfer.lu/publications.html',
	},
	wikipediaLb: {
		id: 'c-nicolas-kohl-wikipedia-lb',
		title: 'Nicolas Kohl',
		publisher: 'Wikipedia (Lëtzebuergesch)',
		url: 'https://lb.wikipedia.org/wiki/Nicolas_Kohl',
	},
} satisfies Record<string, Citation>

export const nicolasKohlCitations = c

export const nicolasKohlArticle: Article = {
	id: 'a-nicolas-kohl',
	slug: 'nicolas-kohl',
	locale: 'en',
	title: 'Nicolas Kohl',
	summary:
		'Nicolas Kohl (1921–2020) was a Luxembourgish civil servant and amateur archaeologist who, together with Georges Faber, launched and for two decades led the investigation of the Raschpëtzer — the discovery this wiki’s main article covers.',
	categories: ['archaeology', 'history', 'people'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				cite(
					'Nicolas Kohl (1921–2020) was a Luxembourgish civil servant and amateur archaeologist',
					'c-nicolas-kohl-wikipedia-lb',
				),
				t(' who, with '),
				link('Georges Faber', 'georges-faber'),
				cite(
					', initiated and for two decades personally led the investigation of the ',
					'c-nicolas-kohl-brochure-p37',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					', the Roman-era underground water gallery in Helmsange Forest near Walferdange. He was, by the site brochure’s own account, present at both ends of the discovery: the 1966 meeting that started the research, and ',
				),
				cite(
					'the October 1986 breakthrough into the gallery itself, which he was the first person to enter in nearly two thousand years',
					'c-nicolas-kohl-brochure-p9',
				),
				t('.'),
			),
		},
		{
			id: 'h-partnership',
			type: 'heading',
			level: 2,
			text: 'The 1966 meeting and the Faber–Kohl partnership',
		},
		{
			id: 'p-partnership',
			type: 'paragraph',
			runs: p(
				cite(
					'In 1966, Georges Faber drafted a manuscript covering everything then known about the Raschpëtzer and its possible interpretation, and presented it to Nicolas Kohl, at the time vice-president of the Syndicat d’Initiative et Tourisme (SIT) of Walferdange, founded a year earlier',
					'c-nicolas-kohl-brochure-p8',
				),
				t('. '),
				cite(
					'Kohl spontaneously offered Faber his help and the backing of the SIT to solve the mystery of the ground depressions on the Pëtschend plateau — the start of what the brochure calls a long-lasting and dynamic co-operation: until 1986, the "Faber-Kohl duo" acted on its own and tirelessly led the excavation and research work',
					'c-nicolas-kohl-brochure-p8',
				),
				t('.'),
			),
		},
		{ id: 'h-1986', type: 'heading', level: 2, text: 'The 1986 breakthrough' },
		{
			id: 'p-1986-excavation',
			type: 'paragraph',
			runs: p(
				cite(
					'When systematic excavation resumed in August 1986 with the EFCO company’s work starting on 4 August, Faber and Kohl formed the supervision team that remained on site throughout, monitoring progress, examining excavated material, keeping records, and compiling photographic and film documentation',
					'c-nicolas-kohl-brochure-p9',
				),
				t('.'),
			),
		},
		{
			id: 'p-1986-breakthrough',
			type: 'paragraph',
			runs: p(
				cite(
					'On 3 October 1986, once the shaft bottom was reached at a depth of 35 metres and the gallery came into view, Nicolas Kohl was the first human being in nearly 2,000 years to enter it',
					'c-nicolas-kohl-brochure-p9',
				),
				t('. '),
				cite(
					'In the days that followed, Georges Faber surveyed the newly discovered gallery segment between shafts P4 and P6, Kohl produced the first cine film of the find, and Sonja Faber shot the first photographs',
					'c-nicolas-kohl-brochure-p10',
				),
				t('. The brochure’s own photo captions record the moment: '),
				cite(
					'a picture of "Nicolas Kohl and Georges Faber in the gallery between P5 and P6," and a group photo of "the research team as of 1986 standing near P1" naming Georges Faber, Pit Kayser, Nicolas Kohl, and Guy Waringo',
					'c-nicolas-kohl-brochure-p10',
				),
				t('.'),
			),
		},
		{
			id: 'h-legacy',
			type: 'heading',
			level: 2,
			text: 'Acknowledged role and later publications',
		},
		{
			id: 'p-legacy',
			type: 'paragraph',
			runs: p(
				cite(
					'The brochure’s acknowledgements state plainly that the Raschpëtzer investigations owe their start, 50 years earlier, to the initiative of two private individuals, Georges Faber and Nicolas Kohl, both members of the Syndicat d’Initiative et de Tourisme of Walferdange, and that their determination kept the project going through changing circumstances',
					'c-nicolas-kohl-brochure-p37',
				),
				t('. '),
				cite(
					'Kohl, together with Pit Kayser, also helped prepare the 2018 brochure itself and supplied illustration material for it',
					'c-nicolas-kohl-brochure-p37',
				),
				t('.'),
			),
		},
		{ id: 'h-publications', type: 'heading', level: 2, text: 'Publications' },
		{
			id: 'p-publications',
			type: 'paragraph',
			runs: p(
				cite(
					'The brochure’s bibliography credits Kohl as sole or co-author of several of the earlier works it draws on, including his own 1987 account of the gallery’s discovery, a 1990 retrospective co-authored with Faber, a 1995 excavation chronicle co-authored with Faber and Waringo, and a 2003 study co-authored with Waringo',
					'c-nicolas-kohl-brochure-p38',
				),
				t('. '),
				cite(
					'SIT Walferdange’s own publications page lists at least ten further titles by Kohl (solo or with Waringo) on the Raschpëtzer between 1982 and 2009',
					'c-nicolas-kohl-sitwalfer-publications',
				),
				t(
					', consistent with the decades-long, still-cited role in the site’s documentation that the brochure describes.',
				),
			),
		},
		{ id: 'h-life', type: 'heading', level: 2, text: 'Life' },
		{
			id: 'p-life',
			type: 'paragraph',
			runs: p(
				cite(
					'Nicolas Kohl was born on 31 January 1921 and died on 21 September 2020, both in Luxembourg City. He worked as a Luxembourg state civil servant — chief advisor in the retired-personnel division of the state personnel administration — and separately served as president of the Syndicat d’Initiative of Walferdange',
					'c-nicolas-kohl-wikipedia-lb',
				),
				t(
					'. Beyond these facts and his documented Raschpëtzer role above, no further independently verifiable biographical detail was found.',
				),
			),
		},
	],
	citations: [
		c.brochureMeeting,
		c.brochureExcavation1986,
		c.brochurePhotoCaptions,
		c.brochureAcknowledgements,
		c.brochureBibliography,
		c.sitWalferPublications,
		c.wikipediaLb,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: Nicolas Kohl’s role verified via the vendored brochure PDF and web search',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
