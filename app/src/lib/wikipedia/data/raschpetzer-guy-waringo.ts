/**
 * Real content: Guy Waringo, co-author of the 2018 Raschpëtzer brochure and its 2015/2017
 * predecessors — split out from the former combined `raschpetzer-people.ts` (per-person
 * articles instead of one page covering everyone) so he gets his own page. Citations carried
 * over verbatim from that file's verified sourcing (brochure PDF page extraction + live web
 * search, real URLs only).
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
		id: 'c-waringo-brochure-title',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (title page: authors & ISBN)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=1`,
	},
	brochureBibliography: {
		id: 'c-waringo-brochure-biblio',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 38, bibliography — the same three authors’ 2015 & 2017 papers)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=38`,
	},
	frontinus2017: {
		id: 'c-waringo-frontinus-2017',
		title: 'A major Roman Qanat in Walferdange, Luxembourg, in Wasserwesen zur Zeit des Frontinus: Bauwerke – Technik – Kultur (40th-anniversary Frontinus-Gesellschaft symposium, Trier, 2016), BABESCH Suppl. 32, pp. 241–253',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2017,
		publisher: 'Frontinus-Gesellschaft (symposium proceedings)',
		url: 'http://www.romanaqueducts.info/aquanews/TOC40jahreFrontinusGesellschaft.pdf',
	},
	tourismAwards: {
		id: 'c-waringo-tourismawards',
		title: 'Raschpëtzer — Guy Waringo',
		publisher: 'Luxembourg Tourism Awards',
		url: 'https://tourismawards.lu/en/project/raschpetzer-guy-waringo/',
	},
	sitWalferPublications: {
		id: 'c-waringo-sitwalfer-publications',
		title: 'Publications',
		publisher: "Syndicat d'initiative et de tourisme (SIT) Walferdange",
		url: 'https://www.sitwalfer.lu/publications.html',
	},
	chronicleLu: {
		id: 'c-waringo-chronicle-lu',
		title: 'Archaeology in Luxembourg: Raschpëtzer Qanat',
		publisher: 'Chronicle.lu',
		url: 'https://www.chronicle.lu/category/history-archaeology/56283-archaeology-in-luxembourg-raschpetzer-qanat',
	},
} satisfies Record<string, Citation>

export const guyWaringoCitations = c

export const guyWaringoArticle: Article = {
	id: 'a-guy-waringo',
	slug: 'guy-waringo',
	locale: 'en',
	title: 'Guy Waringo',
	summary:
		'Guy Waringo is a researcher who has studied the Raschpëtzer since the 1960s and co-authored the site’s three published works, including the 2018 brochure.',
	categories: ['archaeology', 'history', 'people'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				cite(
					'Guy Waringo has researched the Raschpëtzer since the 1960s, alongside other volunteers and interested residents of Walferdange, advancing the research, writing books, giving lectures, and guiding visitors through the site',
					'c-waringo-tourismawards',
				),
				t(' — a decades-long, still-ongoing role in documenting the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' rather than a one-time credit.'),
			),
		},
		{ id: 'h-publications', type: 'heading', level: 2, text: 'Publications' },
		{
			id: 'p-publications',
			type: 'paragraph',
			runs: p(
				cite(
					'The Raschpëtzer — A Roman Underground Water Supply System (2018) lists Guy Waringo, Sonja Faber and Henri Werner as its three co-authors',
					'c-waringo-brochure-title',
				),
				t(', published by the '),
				t("Syndicat d'initiative et de tourisme de la Commune de Walferdange"),
				t(' (ISBN 978-2-9199454-2-9). '),
				cite(
					'The same three-person team had already co-written a 2015 retrospective, "50 Jahre Raschpëtzer-Forschung" ("50 years of Raschpëtzer research"), and a 2017 English-language conference paper before the 2018 brochure',
					'c-waringo-brochure-biblio',
				),
				t('. '),
				cite(
					"SIT Walferdange's own publications list credits him as co-author on at least six Raschpëtzer titles since 1990, several written with Nicolas Kohl and Pierre Kayser",
					'c-waringo-sitwalfer-publications',
				),
				t('. Beyond the 2018 brochure, '),
				cite(
					'he co-authored the international paper "A major Roman Qanat in Walferdange, Luxembourg" with Sonja Faber and Henri Werner, presented at the 40th-anniversary Frontinus-Gesellschaft symposium in Trier and published in its proceedings',
					'c-waringo-frontinus-2017',
				),
				t('.'),
			),
		},
		{ id: 'h-role', type: 'heading', level: 2, text: 'Other contributions' },
		{
			id: 'p-role',
			type: 'paragraph',
			runs: p(
				cite(
					'He has also been individually credited for site photography (for instance, of water disappearing into limestone fissures on the plateau)',
					'c-waringo-chronicle-lu',
				),
				cite(
					', and continues to work on visitor infrastructure, including a planned observation tower in the Helmsange Forest',
					'c-waringo-tourismawards',
				),
				t('.'),
			),
		},
	],
	citations: [
		c.brochureTitlePage,
		c.brochureBibliography,
		c.frontinus2017,
		c.tourismAwards,
		c.sitWalferPublications,
		c.chronicleLu,
	],
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
