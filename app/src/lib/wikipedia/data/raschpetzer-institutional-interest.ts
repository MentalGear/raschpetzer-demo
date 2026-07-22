/**
 * Placeholder content: a tracking page for institutional and academic interest in the
 * Raschpëtzer qanat — both the Luxembourg institutions already documented elsewhere in
 * this corpus (linked here rather than re-described) and international academic contacts,
 * which are not yet documented and are marked explicitly as such rather than guessed at.
 * Requested as a placeholder specifically to hold a spot for e.g. an ETH Zürich research-
 * interest request letter to be added later — see the callout and the "International
 * academic interest" section below, both of which state plainly that they are unfilled
 * rather than imply completeness.
 */
import type { Article, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./mock) so this module has no circular dependency; mock.ts is the one
// that imports articles FROM here to append to its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const p = (...runs: Inline): Inline => runs

export const institutionalInterestArticle: Article = {
	id: 'a-institutional-interest',
	slug: 'institutional-academic-interest',
	locale: 'en',
	title: 'Institutional and Academic Interest',
	summary:
		'A tracking page for organizations and researchers, in Luxembourg and internationally, with a documented or expressed interest in the Raschpëtzer qanat — its excavation, its preservation, or its place in the wider study of Roman-era qanats. This page is a placeholder: the national section links to institutions already covered elsewhere in this corpus, while the international section is deliberately left open for content not yet available.',
	categories: ['history'],
	blocks: [
		{
			id: 'callout-placeholder',
			type: 'callout',
			variant: 'note',
			title: 'Placeholder — under construction',
			runs: p(
				t(
					'This page is a scaffold, not a finished article. The national section below links to institutions this corpus already documents in full elsewhere; the international section names organizations known to have an interest but currently holds no sourced detail — each such entry is marked "to be added" rather than filled in with unverified claims.',
				),
			),
		},
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Beyond the excavators and authors already covered by this corpus, the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat has drawn interest from a number of institutions — some local to Luxembourg and directly responsible for its excavation, conservation, and public access, others international bodies with an academic interest in Roman-era water engineering more broadly.',
				),
			),
		},
		{ id: 'h-national', type: 'heading', level: 2, text: 'National institutions (Luxembourg)' },
		{
			id: 'p-national',
			type: 'paragraph',
			runs: p(
				t(
					"Each of the following already has its own article in this corpus; see that article for its full role in the site's history rather than a repeated summary here.",
				),
			),
		},
		{
			id: 'list-national',
			type: 'list',
			ordered: false,
			items: [
				p(
					link(
						"Syndicat d'Initiative et de Tourisme (SIT) Walferdange",
						'sit-walferdange',
					),
					t(
						' — the local tourism association that published the 2018 brochure and maintains public access to the site.',
					),
				),
				p(
					link("Musée National d'Archéologie, d'Histoire et d'Art", 'mnha'),
					t(
						' — the national museum that holds and conserves finds from the site, including the oak shovel.',
					),
				),
				p(
					b('Centre National de Recherche Archéologique (CNRA)'),
					t(
						" — Luxembourg's national archaeology research centre; credited (with photographer André Schoellen) for the aerial and excavation photography of the comparable Noertzange and Émerange qanats discussed in the ",
					),
					link('main article', 'raschpetzer-qanat'),
					t('. No dedicated article for the CNRA exists yet in this corpus.'),
				),
			],
		},
		{
			id: 'h-international',
			type: 'heading',
			level: 2,
			text: 'International academic interest',
		},
		{
			id: 'p-international',
			type: 'paragraph',
			runs: p(
				t(
					"The Raschpëtzer's qanat-style construction — unusual this far north in the former Roman Empire, see ",
				),
				link('Roman Aqueducts', 'roman-aqueducts'),
				t(
					" — has drawn academic interest beyond Luxembourg's own institutions. Documented international engagement so far:",
				),
			),
		},
		{
			id: 'list-international',
			type: 'list',
			ordered: false,
			items: [
				p(
					link('Frontinus-Gesellschaft e.V.', 'frontinus-gesellschaft'),
					t(
						' (Germany) — the learned society for the history of water, energy and pipeline technology whose 2016 Trier symposium published the international paper on the Raschpëtzer; see that article for the full account.',
					),
				),
				p(
					b('ETH Zürich'),
					t(' (Switzerland) — '),
					b('[placeholder: request letter to be added]'),
					t(
						". No sourced detail is available yet on the nature or scope of this institution's interest; this entry exists only to reserve a place for it once documentation is provided.",
					),
				),
			],
		},
		{
			id: 'p-closing',
			type: 'paragraph',
			runs: p(
				t(
					'Additional institutions — national or international — can be added to either list as documentation becomes available; entries without a source should stay marked as placeholders rather than be filled in with assumed detail.',
				),
			),
		},
	],
	citations: [],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 22),
			summary: 'Initial placeholder scaffold for institutional/academic interest tracking',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 22),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}
