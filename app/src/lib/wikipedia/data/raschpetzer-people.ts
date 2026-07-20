/**
 * Real content: the people credited by name in the sources this wiki already cites for the
 * Raschpëtzer — the three co-authors of the 2018 brochure (vendored at `static/sources/`) and
 * the two photographers credited on the 2022 MNHA/MNAHA finds photos already used in
 * `raschpetzer.ts`'s finds gallery. Every biographical claim is sourced: brochure-derived facts
 * deep-link into the vendored PDF (`#page=N`, verified by extracting those pages directly —
 * title page = authors/ISBN, p.38 = bibliography listing the team's earlier co-authored work);
 * everything else comes from a live web search with its real URL kept as the citation. Per the
 * task brief: no invented biography — where search turned up nothing verifiable for a named
 * person (Sonja Faber, Ben Muller), the article says so plainly instead of padding.
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

// Page locators verified by extracting the vendored brochure PDF directly (pypdf/PyMuPDF):
// p.1/p.3 = title page ("A Roman Underground Water Supply System" / Guy Waringo, Sonja Faber,
// Henri Werner / © 2018 SIT Walferdange / ISBN 978-2-9199454-2-9); p.38 = bibliography, which
// lists the same three authors' two earlier co-authored works (2015, 2017).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	brochureTitlePage: {
		id: 'c-people-brochure-title',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (title page: authors & ISBN)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=1`,
	},
	brochureBibliography: {
		id: 'c-people-brochure-biblio',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 38, bibliography — the same three authors’ 2015 & 2017 papers)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=38`,
	},
	frontinus2017: {
		id: 'c-people-frontinus-2017',
		title: 'A major Roman Qanat in Walferdange, Luxembourg, in Wasserwesen zur Zeit des Frontinus: Bauwerke – Technik – Kultur (40th-anniversary Frontinus-Gesellschaft symposium, Trier, 2016), BABESCH Suppl. 32, pp. 241–253',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2017,
		publisher: 'Frontinus-Gesellschaft (symposium proceedings)',
		url: 'http://www.romanaqueducts.info/aquanews/TOC40jahreFrontinusGesellschaft.pdf',
	},
	tourismAwards: {
		id: 'c-people-tourismawards',
		title: 'Raschpëtzer — Guy Waringo',
		publisher: 'Luxembourg Tourism Awards',
		url: 'https://tourismawards.lu/en/project/raschpetzer-guy-waringo/',
	},
	sitWalferPublications: {
		id: 'c-people-sitwalfer-publications',
		title: 'Publications',
		publisher: "Syndicat d'initiative et de tourisme (SIT) Walferdange",
		url: 'https://www.sitwalfer.lu/publications.html',
	},
	chronicleLu: {
		id: 'c-people-chronicle-lu',
		title: 'Archaeology in Luxembourg: Raschpëtzer Qanat',
		publisher: 'Chronicle.lu',
		url: 'https://www.chronicle.lu/category/history-archaeology/56283-archaeology-in-luxembourg-raschpetzer-qanat',
	},
	mnhaShovelPhoto: {
		id: 'c-people-mnha-shovel-photo',
		title: 'Wooden shovel found near shaft P9 — photograph credit line',
		authors: 'Lucas, Tom; Muller, Ben',
		year: 2022,
		publisher: "Musée National d'Archéologie, d'Histoire et d'Art (MNHA/MNAHA)",
		url: asset('/img/raschpetzer/a-shovel-P9-FOTO-Tom-Lucas-Ben-Muller-MNHA-2022-fallback.jpg'),
	},
	mnahaCollectionsExample: {
		id: 'c-people-mnaha-collections',
		title: "MNAHA collections record crediting Tom Lucas as photographer (e.g. object 'mnha19776')",
		publisher: "Musée National d'Archéologie, d'Histoire et d'Art (MNAHA) online collections",
		url: 'https://collections.mnaha.lu/object/mnha19776/',
	},
} satisfies Record<string, Citation>

export const peopleArticleCitations = c

export const peopleArticle: Article = {
	id: 'a-raschpetzer-people',
	slug: 'raschpetzer-people',
	locale: 'en',
	title: 'People of the Raschpëtzer Research',
	summary:
		'The people credited by name in the sources this wiki cites for the Raschpëtzer: the three co-authors of the 2018 site brochure, and the two photographers credited on the 2022 museum photographs of the shaft-P9 finds.',
	categories: ['archaeology', 'history'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The written and photographic record behind this wiki’s coverage of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' rests on named contributors. This page collects what could be verified about them: the three co-authors of the 2018 English-language site brochure, and the two photographers credited on the 2022 museum photographs of the finds recovered near shaft P9. Where a web search turned up little or nothing beyond a name on a credit line, that is stated plainly below rather than padded out.',
				),
			),
		},
		{ id: 'h-brochure', type: 'heading', level: 2, text: 'The 2018 brochure' },
		{
			id: 'p-brochure',
			type: 'paragraph',
			runs: p(
				cite(
					'The Raschpëtzer — A Roman Underground Water Supply System (2018) lists Guy Waringo, Sonja Faber and Henri Werner as its three co-authors',
					'c-people-brochure-title',
				),
				t(', published by the '),
				t("Syndicat d'initiative et de tourisme de la Commune de Walferdange"),
				t(' (ISBN 978-2-9199454-2-9). '),
				cite(
					'The same three-person team had already co-written a 2015 retrospective, "50 Jahre Raschpëtzer-Forschung" ("50 years of Raschpëtzer research"), and a 2017 English-language conference paper before the 2018 brochure',
					'c-people-brochure-biblio',
				),
				t(
					' — the brochure is the most recent entry in a long-running, jointly-authored body of work on the site, not a one-off.',
				),
			),
		},
		{ id: 'h-waringo', type: 'heading', level: 2, text: 'Guy Waringo' },
		{
			id: 'p-waringo',
			type: 'paragraph',
			runs: p(
				cite(
					'Guy Waringo has researched the Raschpëtzer since the 1960s, alongside other volunteers and interested residents of Walferdange, advancing the research, writing books, giving lectures, and guiding visitors through the site',
					'c-people-tourismawards',
				),
				t(' — a decades-long, still-ongoing role rather than a one-time credit. '),
				cite(
					"SIT Walferdange's own publications list credits him as co-author on at least six Raschpëtzer titles since 1990, several written with Nicolas Kohl and Pierre Kayser",
					'c-people-sitwalfer-publications',
				),
				t('. Beyond the 2018 brochure, '),
				cite(
					'he co-authored the international paper "A major Roman Qanat in Walferdange, Luxembourg" with Sonja Faber and Henri Werner, presented at the 40th-anniversary Frontinus-Gesellschaft symposium in Trier and published in its proceedings',
					'c-people-frontinus-2017',
				),
				t('. '),
				cite(
					'He has also been individually credited for site photography (for instance, of water disappearing into limestone fissures on the plateau)',
					'c-people-chronicle-lu',
				),
				cite(
					', and continues to work on visitor infrastructure, including a planned observation tower in the Helmsange Forest',
					'c-people-tourismawards',
				),
				t('.'),
			),
		},
		{ id: 'h-faber', type: 'heading', level: 2, text: 'Sonja Faber' },
		{
			id: 'p-faber',
			type: 'paragraph',
			runs: p(
				cite(
					'Sonja Faber is credited as co-author of the 2018 brochure',
					'c-people-brochure-title',
				),
				cite(
					', as well as its 2015 and 2017 predecessors written with the same two collaborators',
					'c-people-brochure-biblio',
				),
				t(
					'. Web search for this page turned up no further independently verifiable biographical detail about her — no affiliation, credentials, or other bylined work distinct from the three co-authored Raschpëtzer publications above could be confirmed. (She is not the same person as Georges Faber, the private individual credited elsewhere in the brochure’s acknowledgements as one of the two founders of the Raschpëtzer investigations in the 1960s.) Her documented role here rests on these co-authorship credits alone.',
				),
			),
		},
		{ id: 'h-werner', type: 'heading', level: 2, text: 'Henri Werner' },
		{
			id: 'p-werner',
			type: 'paragraph',
			runs: p(
				cite(
					'Henri Werner is credited as co-author of the 2018 brochure',
					'c-people-brochure-title',
				),
				cite(' and its 2015 and 2017 predecessors', 'c-people-brochure-biblio'),
				t('. '),
				cite(
					'A Chronicle.lu overview of the site separately credits "H. Werner" with helping create the qanat’s 3D model',
					'c-people-chronicle-lu',
				),
				t(
					'. As with Sonja Faber, no further independently verifiable biography was found; his documented contribution here rests on the three co-authorship credits and the 3D-model credit above.',
				),
			),
		},
		{ id: 'h-photographers', type: 'heading', level: 2, text: 'Tom Lucas and Ben Muller' },
		{
			id: 'p-photographers',
			type: 'paragraph',
			runs: p(
				cite(
					'The front- and back-view photographs of the oak shovel recovered near shaft P9, used in this wiki’s Raschpëtzer article, are credited to Tom Lucas and Ben Muller of the Musée National d’Archéologie, d’Histoire et d’Art (MNHA/MNAHA), 2022',
					'c-people-mnha-shovel-photo',
				),
				t('. '),
				cite(
					'Tom Lucas is credited as photographer on numerous other MNAHA collection records, consistent with a role as one of the museum’s regular collections photographers',
					'c-people-mnaha-collections',
				),
				t(
					'. No independently verifiable biographical information about Ben Muller was found; his documented role here is limited to the shared 2022 photo credit above.',
				),
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
		c.mnhaShovelPhoto,
		c.mnahaCollectionsExample,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: named contributors verified via the vendored brochure PDF and web search',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
