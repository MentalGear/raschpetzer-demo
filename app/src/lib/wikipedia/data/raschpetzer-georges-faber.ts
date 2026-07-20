/**
 * Real content: Georges Faber, one of the two private individuals the 2018 brochure's own
 * acknowledgements credit with starting the Raschpëtzer investigations in the 1960s — a genuine
 * finding from following up the name "George(s) Faber" against this wiki's sources (task brief:
 * check for any connection to the Raschpëtzer/Walferdange/Luxembourg heritage before writing
 * anything). He is NOT the same person as Sonja Faber, the 2018 brochure co-author covered in
 * `raschpetzer-sonja-faber.ts` — that article already flags the distinction (and already links
 * forward to this slug, `georges-faber`); this one verifies and expands it. Every biographical
 * claim is sourced: brochure-derived facts deep-link into the vendored PDF (`#page=N`, verified
 * by extracting pages 7–10, 37–38 directly), and the Nicolas Kohl connection — see the sibling
 * `raschpetzer-nicolas-kohl.ts` article — is independently corroborated by a live web source
 * (Luxembourgish Wikipedia's Nicolas Kohl article), not just the brochure alone. Sonja Faber is
 * his daughter — an editorial correction (2026-07-20): stated per project/site knowledge, not
 * backed by a citable public source, unlike every other biographical claim in this file.
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

// Page locators verified by extracting the vendored brochure PDF directly (PyMuPDF): p.7
// (excavation chronicle opens, photo credited "G. Faber"), p.8 (1966 manuscript, meeting
// Nicolas Kohl, the "Faber-Kohl duo"), p.9 (1986 supervision team, gallery discovery), p.10
// (post-discovery survey work, captioned team photos), p.37 (Acknowledgements: "two private
// individuals, Georges Faber and Nicolas Kohl"), p.38 (bibliography: five works by "Faber, G.").
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	brochureAcknowledgements: {
		id: 'c-georges-faber-brochure-p37',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 37, Acknowledgements: "two private individuals, Georges Faber and Nicolas Kohl")',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=37`,
	},
	brochureManuscript1966: {
		id: 'c-georges-faber-brochure-p8',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 8, the 1966 manuscript and the Faber–Kohl collaboration)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=8`,
	},
	brochureDiscovery1986: {
		id: 'c-georges-faber-brochure-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, the 1986 gallery discovery)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	brochureSurveyAndTeam: {
		id: 'c-georges-faber-brochure-p10',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10, survey work and the captioned 1986 team photograph)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	brochureBibliography: {
		id: 'c-georges-faber-brochure-p38',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 38, bibliography — five works credited to "Faber, G.")',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=38`,
	},
	nicolasKohlWikipedia: {
		id: 'c-georges-faber-nicolaskohl-wp',
		title: 'Nicolas Kohl (Luxembourgish Wikipedia) — independently confirms Kohl and Georges Faber as joint initiators of Raschpëtzer research',
		publisher: 'Wikipedia (Lëtzebuergesch)',
		url: 'https://lb.wikipedia.org/wiki/Nicolas_Kohl',
	},
	sitWalferPublications: {
		id: 'c-georges-faber-sitwalfer-publications',
		title: 'Publications',
		publisher: "Syndicat d'initiative et de tourisme (SIT) Walferdange",
		url: 'https://www.sitwalfer.lu/publications.html',
	},
} satisfies Record<string, Citation>

export const georgesFaberCitations = c

export const georgesFaberArticle: Article = {
	id: 'a-raschpetzer-georges-faber',
	slug: 'georges-faber',
	locale: 'en',
	title: 'Georges Faber',
	summary:
		'Georges Faber was, together with Nicolas Kohl, one of the two private individuals credited in the 2018 site brochure with starting the Raschpëtzer investigations in the mid-1960s. As an amateur researcher he drafted the first manuscript on the site, then spent two decades leading fieldwork with Kohl that culminated in the October 1986 discovery of the qanat gallery itself.',
	categories: ['archaeology', 'history', 'people'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Georges Faber was, together with '),
				link('Nicolas Kohl', 'nicolas-kohl'),
				t(', one of the '),
				cite(
					"two private individuals — both members of the Syndicat d'Initiative et de Tourisme (SIT) of Walferdange — whom the 2018",
					'c-georges-faber-brochure-p37',
				),
				t(' '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				cite(
					' site brochure credits, in its own acknowledgements, with starting the site\'s investigations "50 years ago", i.e. around the mid-1960s relative to the brochure\'s 2018 publication',
					'c-georges-faber-brochure-p37',
				),
				t('. He is not the same person as '),
				link('Sonja Faber', 'sonja-faber'),
				t(
					", one of the brochure's three named co-authors — that article already notes the distinction. Sonja Faber is his daughter (editorial note: stated per project/site knowledge, not backed by a citable public source).",
				),
			),
		},
		{
			id: 'h-manuscript',
			type: 'heading',
			level: 2,
			text: 'A 1966 manuscript and a chance meeting',
		},
		{
			id: 'p-manuscript',
			type: 'paragraph',
			runs: p(
				cite(
					'After a 1964 descent into shafts P1 and P5 by speleologists of the Groupe Spéléologique Luxembourgeois confirmed both were still open, Faber drafted a manuscript gathering everything then known about the Raschpëtzer and its possible interpretation, up to and including the hypothesis that it could be part of a Roman underground aqueduct',
					'c-georges-faber-brochure-p8',
				),
				t('. '),
				cite(
					'In 1966 he presented that manuscript to Nicolas Kohl, then vice-president of the just-founded Syndicat d\'Initiative et Tourisme (SIT) de Walferdange, who "spontaneously offered Georges Faber his help and the support of the SIT"',
					'c-georges-faber-brochure-p8',
				),
				t(
					'. The brochure describes what followed as a two-decade partnership: "until 1986, the Faber-Kohl duo acted on its own and tirelessly led the excavation and research work. Without the commitment of these two pioneers, the mystery of the Raschpëtzer might still be slumbering undetected within the Pëtschend plateau."',
				),
			),
		},
		{ id: 'h-discovery', type: 'heading', level: 2, text: 'The 1986 discovery' },
		{
			id: 'p-discovery',
			type: 'paragraph',
			runs: p(
				cite(
					'In 1984 Faber presented a newly compiled manuscript to visiting officials, including the Minister of Culture, which helped secure a funding commitment that made resumed excavation possible',
					'c-georges-faber-brochure-p8',
				),
				t('. '),
				cite(
					'When excavation of shaft P5 resumed in August 1986, "the supervision team of Georges Faber and Nicolas Kohl remained on site throughout, to monitor the progress of work, to examine the excavated material, to keep records and to compile comprehensive photographic and film documentation"',
					'c-georges-faber-brochure-p9',
				),
				t('. When the gallery was finally reached on 3 October 1986, '),
				cite(
					'"the assumption originally made by Georges Faber that this was the gallery of a Roman qanat was confirmed" once the ballast was cleared and the channel beneath it exposed',
					'c-georges-faber-brochure-p9',
				),
				t('. '),
				cite(
					'The newly discovered gallery segment between shafts P4 and P6 was then surveyed by Georges Faber himself, while Nicolas Kohl shot the first cine film and Sonja Faber took the first photographs — three distinctly credited roles on the same team',
					'c-georges-faber-brochure-p10',
				),
				t(
					'. A brochure photograph from later that year, captioned "Georges Faber, Pit Kayser, Nicolas Kohl, Guy Waringo," records the research team as it stood by then.',
				),
			),
		},
		{ id: 'h-legacy', type: 'heading', level: 2, text: 'Publications and legacy' },
		{
			id: 'p-legacy',
			type: 'paragraph',
			runs: p(
				cite(
					'The brochure\'s bibliography credits "Faber, G." with five works spanning 1966 to 2015: the original 1966 and 1984 manuscripts, a 1990 chapter on qanat construction technique, the co-authored 1990 retrospective "25 Jahre Raschpëtzer-Forschung" with Nicolas Kohl, and a 2015 chapter on the Roman villa near Heisdorf and Helmsange',
					'c-georges-faber-brochure-p38',
				),
				t('. '),
				cite(
					'He is also credited as a co-author, with Nicolas Kohl and Guy Waringo, of the 1995 excavation chronicle covering 1991–1995',
					'c-georges-faber-brochure-p38',
				),
				t(', and '),
				cite(
					"SIT Walferdange's own publications page lists further Faber-credited titles, including a solo 1982 piece on local place-name history",
					'c-georges-faber-sitwalfer-publications',
				),
				t('. '),
				cite(
					'Independently of the brochure, Nicolas Kohl\'s own Luxembourgish Wikipedia article describes the two men as joint initiators of Raschpëtzer research ("den Initiator vun der Raschpëtzer-Fuerschung"), corroborating the brochure\'s account from an unrelated source',
					'c-georges-faber-nicolaskohl-wp',
				),
				t(
					". He also served as president of the Syndicat d'Initiative et de Tourisme (SIT) of Walferdange for twenty years, later succeeded in the role by ",
				),
				link('Henri Werner', 'henri-werner'),
				t(
					' (editorial note: the presidency detail is stated per project/site knowledge, not backed by a citable public source, unlike the citations above). Beyond his Raschpëtzer-related work, his daughter Sonja Faber (see above), and that presidency, no independently verifiable biographical detail — birth or death dates, or profession — could be found; web search turned up only unrelated people sharing the name. This page states that limit plainly rather than filling it in.',
				),
			),
		},
	],
	citations: [
		c.brochureAcknowledgements,
		c.brochureManuscript1966,
		c.brochureDiscovery1986,
		c.brochureSurveyAndTeam,
		c.brochureBibliography,
		c.nicolasKohlWikipedia,
		c.sitWalferPublications,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				"Initial draft: Georges Faber verified via the vendored brochure PDF (acknowledgements, chronicle, bibliography) and independently corroborated via Nicolas Kohl's Wikipedia article",
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
