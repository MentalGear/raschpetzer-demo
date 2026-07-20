/**
 * Real content: Tom Lucas and Ben Muller, the two MNHA/MNAHA photographers credited on the
 * 2022 photographs of the shaft-P9 finds used in this wiki's main article — split out from
 * the former combined `raschpetzer-people.ts`. Kept as one joint page (unlike the three
 * brochure co-authors, who each got their own page): they are always credited together on a
 * single shared photo credit line, with no separate biography found for either individually.
 * Citations carried over verbatim from that file's verified sourcing.
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

const c = {
	mnhaShovelPhoto: {
		id: 'c-photographers-mnha-shovel-photo',
		title: 'Wooden shovel found near shaft P9 — photograph credit line',
		authors: 'Lucas, Tom; Muller, Ben',
		year: 2022,
		publisher: "Musée National d'Archéologie, d'Histoire et d'Art (MNHA/MNAHA)",
		url: asset('/img/raschpetzer/a-shovel-P9-FOTO-Tom-Lucas-Ben-Muller-MNHA-2022-fallback.jpg'),
	},
	mnahaCollectionsExample: {
		id: 'c-photographers-mnaha-collections',
		title: "MNAHA collections record crediting Tom Lucas as photographer (e.g. object 'mnha19776')",
		publisher: "Musée National d'Archéologie, d'Histoire et d'Art (MNAHA) online collections",
		url: 'https://collections.mnaha.lu/object/mnha19776/',
	},
} satisfies Record<string, Citation>

export const photographersCitations = c

export const photographersArticle: Article = {
	id: 'a-photographers',
	slug: 'raschpetzer-photographers',
	locale: 'en',
	title: 'Tom Lucas and Ben Muller',
	summary:
		'Tom Lucas and Ben Muller are the MNHA/MNAHA photographers credited on the 2022 photographs of the finds recovered near shaft P9.',
	categories: ['archaeology', 'history', 'people'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				cite(
					'The front- and back-view photographs of the oak shovel recovered near shaft P9, used in this wiki’s ',
					'c-photographers-mnha-shovel-photo',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				cite(
					' article, are credited to Tom Lucas and Ben Muller of the Musée National d’Archéologie, d’Histoire et d’Art (MNHA/MNAHA), 2022',
					'c-photographers-mnha-shovel-photo',
				),
				t('.'),
			),
		},
		{ id: 'h-role', type: 'heading', level: 2, text: 'Role' },
		{
			id: 'p-role',
			type: 'paragraph',
			runs: p(
				cite(
					'Tom Lucas is credited as photographer on numerous other MNAHA collection records, consistent with a role as one of the museum’s regular collections photographers',
					'c-photographers-mnaha-collections',
				),
				t(
					'. No independently verifiable biographical information about Ben Muller was found; his documented role here is limited to the shared 2022 photo credit above.',
				),
			),
		},
	],
	citations: [c.mnhaShovelPhoto, c.mnahaCollectionsExample],
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
