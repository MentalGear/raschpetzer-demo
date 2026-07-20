/**
 * Real content: the Syndicat d'Initiative et de Tourisme (SIT) Walferdange — the local
 * non-profit tourism association that has published Raschpëtzer research since the 1980s and
 * put out the 2018 brochure ("The Raschpëtzer — A Roman Underground Water Supply System")
 * this wiki is built from (see `raschpetzer.ts`'s `c.brochure*` citations, `publisher` field).
 * Sourced by fetching sitwalfer.lu directly (its "objectives" page, its own Raschpëtzer pages,
 * and its publications list — already cited by `raschpetzer-guy-waringo.ts` and
 * `raschpetzer-nicolas-kohl.ts` as `sitWalferPublications`/`sitWalferPublications`, not
 * repeated here beyond what's needed to describe SIT itself) plus a general-context source on
 * what a Luxembourg "syndicat d'initiative" is (guichet.public.lu). Facts already established
 * and cited in the Nicolas Kohl / Guy Waringo articles (their exact publication counts, dates,
 * etc.) are cross-linked here rather than restated in full.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's tiny inline-run authoring helpers — kept separate, not
// imported from ./raschpetzer or ./mock, for the same no-circular-dependency reason those
// per-person articles do the same.
const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Same base-path-prefixing helper as raschpetzer.ts/raschpetzer-guy-waringo.ts — a citation
 *  `url` literal isn't rewritten by SvelteKit's router, so the GitHub Pages project-subpath
 *  needs prefixing by hand. */
const asset = (path: string): string => `${base}${path}`
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

// Verified live against sitwalfer.lu (its "Our objectives" page, its own Raschpëtzer pages,
// and its publications list) and against guichet.public.lu's page on the annual subsidy for
// syndicats d'initiative, July 2026. The brochure page-8 citation is the same page already
// verified (by PyMuPDF extraction) in raschpetzer-nicolas-kohl.ts's brochureMeeting citation.
const c = {
	about: {
		id: 'c-sit-walfer-about',
		title: 'Our objectives',
		publisher: "Syndicat d'Initiative et de Tourisme (SIT) Walferdange",
		url: 'https://sitwalfer.lu/index_en.html',
	},
	guichetSubsidy: {
		id: 'c-sit-walfer-guichet-subsidy',
		title: "Demande de subside annuel pour les Syndicats d'initiative",
		publisher: 'Guichet.lu (Luxembourg public-administration portal)',
		url: 'https://guichet.public.lu/fr/entreprises/financement-aides/secteurs-activites/tourisme/activite-interet-tourisme-national/subside-annuel-syndicat-initiative.html',
	},
	publicationsList: {
		id: 'c-sit-walfer-publications-list',
		title: 'Publications',
		publisher: "Syndicat d'Initiative et de Tourisme (SIT) Walferdange",
		url: 'https://www.sitwalfer.lu/publications.html',
	},
	brochureTitlePage: {
		id: 'c-sit-walfer-brochure-title',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (title page: publisher & ISBN)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=1`,
	},
	visits: {
		id: 'c-sit-walfer-visits',
		title: 'Raschpëtzer — Visits',
		publisher: "Syndicat d'Initiative et de Tourisme (SIT) Walferdange",
		url: 'http://www.sitwalfer.lu/Raschpetzer3_en.html',
	},
	brochureVicePresident1966: {
		id: 'c-sit-walfer-brochure-p8',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 8, the 1966 meeting and the Faber–Kohl partnership)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=8`,
	},
	kohlPresident: {
		id: 'c-sit-walfer-kohl-president',
		title: 'Nicolas Kohl',
		publisher: 'Wikipedia (Lëtzebuergesch)',
		url: 'https://lb.wikipedia.org/wiki/Nicolas_Kohl',
	},
} satisfies Record<string, Citation>

export const sitWalferdangeCitations = c

export const sitWalferdangeArticle: Article = {
	id: 'a-sit-walferdange',
	slug: 'sit-walferdange',
	locale: 'en',
	title: "Syndicat d'Initiative et de Tourisme (SIT) Walferdange",
	summary:
		"The Syndicat d'Initiative et de Tourisme (SIT) Walferdange is the local non-profit tourism association, founded in 1965, that has published Raschpëtzer research since the 1980s and put out the 2018 site brochure this wiki draws on.",
	categories: ['history'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('A '),
				t('syndicat d’initiative'),
				t(
					' is a small, historically volunteer-driven local body found across Luxembourg (and neighbouring Belgium) that promotes tourism and heritage for a single town or municipality — usually organized as a non-profit association (asbl), often working alongside the municipal administration rather than as a formal arm of it, and ',
				),
				cite(
					'eligible in Luxembourg for an annual subsidy from the Ministry of Economy in exchange for running tourism activities, guided visits, trail upkeep, and local publications',
					'c-sit-walfer-guichet-subsidy',
				),
				t('. The '),
				t('Syndicat d’Initiative et de Tourisme (SIT) Walferdange'),
				t(' is the one covering the Walferdange municipality — home of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' qanat: '),
				cite(
					'a non-profit association dedicated to the touristic expansion and the promotion of local heritage, founded in 1965',
					'c-sit-walfer-about',
				),
				t('.'),
			),
		},
		{ id: 'h-raschpetzer', type: 'heading', level: 2, text: 'Role in Raschpëtzer research' },
		{
			id: 'p-raschpetzer',
			type: 'paragraph',
			runs: p(
				cite(
					"SIT Walferdange's own publications list shows a continuous run of Raschpëtzer titles from the 1980s onward — mostly written by Nicolas Kohl alone or with Guy Waringo, and later with others — running through to 2009",
					'c-sit-walfer-publications-list',
				),
				t(', a publishing effort that fed directly into the 2018 brochure '),
				cite(
					'"The Raschpëtzer — A Roman Underground Water Supply System," which SIT Walferdange itself published',
					'c-sit-walfer-brochure-title',
				),
				t(' and which this wiki’s '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' article and its citations are built from. SIT Walferdange also runs the site’s public access: ',
				),
				cite(
					'the visitor’s gallery is open Sundays from 3:30 to 5:30 pm, April through October',
					'c-sit-walfer-visits',
				),
				t(', with guided visits arranged through the association and the municipality.'),
			),
		},
		{ id: 'h-people', type: 'heading', level: 2, text: 'Connection to Kohl and Waringo' },
		{
			id: 'p-people',
			type: 'paragraph',
			runs: p(
				link('Nicolas Kohl', 'nicolas-kohl'),
				t(
					' and SIT Walferdange are tied together from the very start of the Raschpëtzer investigation: ',
				),
				cite(
					'Kohl was already vice-president of the year-old SIT when, in 1966, Georges Faber brought him the manuscript that launched their decades-long partnership on the site',
					'c-sit-walfer-brochure-p8',
				),
				t(', and '),
				cite(
					'Kohl later served as the association’s president',
					'c-sit-walfer-kohl-president',
				),
				t(' as well. '),
				link('Guy Waringo', 'guy-waringo'),
				t(
					' joined that publishing effort as a SIT-credited co-author from around 1990 onward, and remained one through the 2018 brochure — both men’s Raschpëtzer work is inseparable from the association that printed it. ',
				),
				link('Georges Faber', 'georges-faber'),
				t(' and '),
				link('Henri Werner', 'henri-werner'),
				t(
					" are separately credited (see their own pages) with later SIT presidencies of their own — Faber for twenty years, then Werner for several more — though how those terms line up on the calendar against Kohl's own presidency above isn't established anywhere in this wiki's sources; none of these presidency details carry a citable public source, unlike the rest of this section.",
				),
			),
		},
	],
	citations: [
		c.about,
		c.guichetSubsidy,
		c.publicationsList,
		c.brochureTitlePage,
		c.visits,
		c.brochureVicePresident1966,
		c.kohlPresident,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: SIT Walferdange, verified live against sitwalfer.lu and guichet.public.lu',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
