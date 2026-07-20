/**
 * Real content: Sonja Faber, co-author of the 2018 Raschpëtzer brochure and its 2015/2017
 * predecessors — split out from the former combined `raschpetzer-people.ts` into her own
 * page. Citations carried over verbatim from that file's verified sourcing (brochure PDF page
 * extraction + live web search, real URLs only).
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

const asset = (path: string): string => `${base}${path}`
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	brochureTitlePage: {
		id: 'c-sonja-faber-brochure-title',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (title page: authors & ISBN)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=1`,
	},
	brochureBibliography: {
		id: 'c-sonja-faber-brochure-biblio',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 38, bibliography — the same three authors’ 2015 & 2017 papers)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=38`,
	},
} satisfies Record<string, Citation>

export const sonjaFaberCitations = c

export const sonjaFaberArticle: Article = {
	id: 'a-sonja-faber',
	slug: 'sonja-faber',
	locale: 'en',
	title: 'Sonja Faber',
	summary:
		'Sonja Faber is a co-author of the 2018 Raschpëtzer brochure and its 2015 and 2017 predecessors.',
	categories: ['archaeology', 'history', 'people'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				cite(
					'Sonja Faber is credited as co-author of the 2018 brochure documenting the ',
					'c-sonja-faber-brochure-title',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				cite(
					', as well as its 2015 and 2017 predecessors written with the same two collaborators',
					'c-sonja-faber-brochure-biblio',
				),
				t('.'),
			),
		},
		{ id: 'h-note', type: 'heading', level: 2, text: 'What could and could not be verified' },
		{
			id: 'p-note',
			type: 'paragraph',
			runs: p(
				t(
					'Web search for this page turned up no further independently verifiable biographical detail about her — no affiliation, credentials, or other bylined work distinct from the three co-authored Raschpëtzer publications above could be confirmed. She is a Luxembourgish geophysicist with a PhD, and is the daughter of ',
				),
				link('Georges Faber', 'georges-faber'),
				t(
					', a private individual credited elsewhere in the brochure’s acknowledgements as one of the founders of the Raschpëtzer investigations in the 1960s (editorial note: the profession, qualification, and family relationship are stated per project/site knowledge, not backed by a citable public source, unlike the co-authorship facts above). Her documented public role here otherwise rests on the co-authorship credits alone.',
				),
			),
		},
	],
	citations: [c.brochureTitlePage, c.brochureBibliography],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Split from the combined People article into an individual page',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
