/**
 * Deterministic, hand-authored generic-encyclopedia corpus. Static (no RNG, no DOM,
 * no network) so reading/virtualization/VRT are reproducible. Real prose on purpose —
 * a reading-experience demo needs real content, not lorem ipsum.
 *
 * Content is generic (no project-specific topics) per the PRD decision. Two articles
 * carry a `de` variant to exercise multilingual reading + translation staleness.
 */
import type { Article, Block, Category, Citation, Entity, Inline, TextRun } from './types'
import { raschpetzer, archaeologyCategory } from './raschpetzer'

/** fixed "now" so relative dates + buckets are reproducible (matches Photos/Notes). */
export const REF_NOW = Date.UTC(2026, 5, 1)
const DAY = 86_400_000

// ── tiny inline-run authoring helpers ──────────────────────────────────────────
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const em = (text: string): TextRun => ({ text, marks: { italic: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const note = (text: string, n: string): TextRun => ({ text, marks: { note: n } })
const p = (...runs: Inline): Inline => runs

// ── categories ──────────────────────────────────────────────────────────────────
export const categories: Category[] = [
	{ id: 'science', label: 'Science', description: 'Natural sciences, physics, and the cosmos.' },
	{ id: 'technology', label: 'Technology', description: 'Computing, engineering, and the web.' },
	{ id: 'nature', label: 'Nature', description: 'Living things and the natural world.' },
	{ id: 'history', label: 'History', description: 'People, places, and events of the past.' },
	{ id: 'culture', label: 'Culture', description: 'Art, language, and society.' },
	archaeologyCategory,
]

// ── entities (hover-preview cards + wikilink autocomplete) ────────────────────────
export const entities: Entity[] = [
	{
		id: 'e-photosynthesis',
		slug: 'photosynthesis',
		title: 'Photosynthesis',
		blurb: 'The process by which plants convert light into chemical energy.',
	},
	{
		id: 'e-chlorophyll',
		slug: 'chlorophyll',
		title: 'Chlorophyll',
		blurb: 'The green pigment that captures light in plants and algae.',
	},
	{
		id: 'e-water-cycle',
		slug: 'water-cycle',
		title: 'Water cycle',
		blurb: 'The continuous movement of water through the environment.',
	},
	{
		id: 'e-typography',
		slug: 'typography',
		title: 'Typography',
		blurb: 'The craft of arranging type for legible, beautiful reading.',
	},
	{
		id: 'e-hypertext',
		slug: 'hypertext',
		title: 'Hypertext',
		blurb: 'Text linked to other text — the foundation of the web.',
	},
	{
		id: 'e-honeybee',
		slug: 'honeybee',
		title: 'Honeybee',
		blurb: 'A social insect renowned for pollination and honey.',
	},
	{
		id: 'e-tea',
		slug: 'tea',
		title: 'Tea',
		blurb: 'An aromatic beverage brewed from Camellia sinensis leaves.',
	},
	{
		id: 'e-astrolabe',
		slug: 'astrolabe',
		title: 'Astrolabe',
		blurb: 'An early instrument for measuring the position of stars.',
	},
]

// ── shared citations ──────────────────────────────────────────────────────────────
const C = {
	blackman: {
		id: 'c1',
		title: 'Photosynthesis and its relation to light',
		authors: 'Blackman, F. F.',
		year: 1905,
		publisher: 'Annals of Botany',
	},
	bringhurst: {
		id: 'c2',
		title: 'The Elements of Typographic Style',
		authors: 'Bringhurst, R.',
		year: 2004,
		publisher: 'Hartley & Marks',
	},
	nelson: {
		id: 'c3',
		title: 'Complex information processing: a file structure for the complex',
		authors: 'Nelson, T. H.',
		year: 1965,
		publisher: 'ACM',
	},
	seeley: {
		id: 'c4',
		title: 'The Wisdom of the Hive',
		authors: 'Seeley, T. D.',
		year: 1995,
		publisher: 'Harvard University Press',
	},
} satisfies Record<string, Citation>

// ── articles ──────────────────────────────────────────────────────────────────────
// Authored concisely; each demonstrates a slice of the reading UX (links, citations,
// sidenotes, figures, callouts, lists, tables, math, the Simple-Wikipedia-style variant).

const photosynthesis: Article = {
	id: 'a-photosynthesis',
	slug: 'photosynthesis',
	locale: 'en',
	title: 'Photosynthesis',
	summary:
		'Photosynthesis is how plants, algae, and some bacteria turn sunlight, water, and carbon dioxide into sugars and oxygen — the process that ultimately feeds most life on Earth.',
	categories: ['science', 'nature'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 2,
		alt: 'A leaf backlit by sunlight showing its veins',
		caption: 'Sunlight striking a leaf drives photosynthesis in the chloroplasts.',
		credit: 'Illustration',
	},
	infobox: [
		{ label: 'Inputs', value: 'Light, H₂O, CO₂' },
		{ label: 'Outputs', value: 'Glucose, O₂' },
		{ label: 'Location', value: 'Chloroplast' },
		{ label: 'Pigment', value: 'Chlorophyll' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'Photosynthesis converts light energy into chemical energy stored in sugars. It takes place mainly in the ',
				),
				link('chloroplast', 'chlorophyll'),
				t(', where the pigment '),
				link('chlorophyll', 'chlorophyll'),
				cite(
					' absorbs light most strongly in the red and blue parts of the spectrum.',
					'c1',
				),
			),
		},
		{ id: 'h-overview', type: 'heading', level: 2, text: 'Overview' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t('In broad terms, plants take in '),
				b('carbon dioxide'),
				t(' from the air and '),
				b('water'),
				t(' from the soil, and — powered by sunlight — release '),
				b('oxygen'),
				note(
					' The oxygen we breathe is a by-product of this reaction.',
					'Almost all atmospheric oxygen originates from photosynthesis over geological time.',
				),
				t(' while building sugars.'),
			),
		},
		{
			id: 'callout-1',
			type: 'callout',
			variant: 'info',
			title: 'In one line',
			runs: p(t('Light + water + carbon dioxide → sugar + oxygen.')),
		},
		{ id: 'h-stages', type: 'heading', level: 2, text: 'The two stages' },
		{
			id: 'list-1',
			type: 'list',
			ordered: true,
			items: [
				p(
					b('Light-dependent reactions'),
					t(' capture energy from sunlight and split water.'),
				),
				p(
					b('The Calvin cycle'),
					t(' uses that energy to assemble sugar from carbon dioxide.'),
				),
			],
		},
		{ id: 'h-equation', type: 'heading', level: 3, text: 'Overall equation' },
		{
			id: 'math-1',
			type: 'math',
			display: true,
			tex: '6\\,CO_2 + 6\\,H_2O \\;\\xrightarrow{\\text{light}}\\; C_6H_{12}O_6 + 6\\,O_2',
		},
		{ id: 'h-limits', type: 'heading', level: 2, text: 'Limiting factors' },
		{
			id: 'p3',
			type: 'paragraph',
			runs: p(
				t(
					'The rate of photosynthesis is bounded by whichever factor is in shortest supply — light intensity, carbon-dioxide concentration, or temperature. This ',
				),
				em('principle of limiting factors'),
				cite(' was described by F. F. Blackman in 1905.', 'c1'),
			),
		},
		{
			id: 'table-1',
			type: 'table',
			headers: ['Factor', 'Effect when increased'],
			rows: [
				['Light intensity', 'Faster, until light-saturated'],
				['CO₂ concentration', 'Faster, until CO₂-saturated'],
				['Temperature', 'Faster, until enzymes denature'],
			],
		},
	],
	citations: [C.blackman],
	revisions: [
		{ id: 'r1', author: 'Ada', ts: REF_NOW - 40 * DAY, summary: 'Initial draft', blocks: [] },
		{
			id: 'r2',
			author: 'Bruno',
			ts: REF_NOW - 12 * DAY,
			summary: 'Add limiting-factors section',
			blocks: [],
		},
		{
			id: 'r3',
			author: 'Chen',
			ts: REF_NOW - 3 * DAY,
			summary: 'Clarify lead + fix equation',
			blocks: [],
		},
	],
	updatedAt: REF_NOW - 3 * DAY,
	contributors: ['Ada', 'Bruno', 'Chen'],
}

/** A genuinely separate, cross-linked Simple-Wikipedia-style rewrite of `photosynthesis`
 *  (shorter sentences, fewer technical terms, no equation/limiting-factors depth) — see
 *  `Article.simpleOfId` in `./types.ts`. Not a translation and not a collapsed tier of the
 *  same article: its own id/slug, edited/reviewed/published through the same flow as any
 *  other article. */
const photosynthesisSimple: Article = {
	id: 'a-photosynthesis-simple',
	slug: 'photosynthesis-simple',
	locale: 'en',
	title: 'Photosynthesis (Simple English)',
	summary:
		'Photosynthesis is how plants make their own food using sunlight, water, and air — explained in plain language.',
	categories: ['science', 'nature'],
	simpleOfId: 'a-photosynthesis',
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 2,
		alt: 'Sunlight shining through green leaves',
		caption: 'Leaves catch sunlight and use it to make food for the plant.',
		credit: 'Illustration',
	},
	infobox: [
		{ label: 'Inputs', value: 'Sunlight, water, air' },
		{ label: 'Outputs', value: 'Sugar, oxygen' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t('Photosynthesis is how plants make their own food. They use '),
				b('sunlight'),
				t(', '),
				b('water'),
				t(', and '),
				b('air'),
				t(' to make sugar. The sugar gives the plant energy to grow.'),
			),
		},
		{ id: 'h-need', type: 'heading', level: 2, text: 'What a plant needs' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t(
					'A plant takes in carbon dioxide from the air through tiny holes in its leaves. It takes in water through its roots. Sunlight gives the plant the energy to turn these into sugar. As this happens, the plant lets out oxygen — the same oxygen we breathe.',
				),
			),
		},
		{
			id: 'callout-1',
			type: 'callout',
			variant: 'info',
			title: 'In one line',
			runs: p(t('Sunlight + water + carbon dioxide → sugar + oxygen.')),
		},
		{ id: 'h-where', type: 'heading', level: 2, text: 'Where it happens' },
		{
			id: 'p3',
			type: 'paragraph',
			runs: p(
				t(
					'This all happens inside the leaf, in tiny green parts called chloroplasts. A green substance called ',
				),
				link('chlorophyll', 'chlorophyll'),
				t(' catches the sunlight — it is also what makes leaves look green.'),
			),
		},
		{ id: 'h-why', type: 'heading', level: 2, text: 'Why it matters' },
		{
			id: 'p4',
			type: 'paragraph',
			runs: p(
				t(
					'Photosynthesis makes the oxygen most living things need to breathe. It is also the first step in almost every food chain on Earth, tying it closely to the ',
				),
				link('water cycle', 'water-cycle'),
				t(', which also depends on plants and sunlight.'),
			),
		},
	],
	citations: [],
	revisions: [
		{
			id: 'r1',
			author: 'Ada',
			ts: REF_NOW - 15 * DAY,
			summary: 'Initial simplified draft',
			blocks: [],
		},
		{
			id: 'r2',
			author: 'Ada',
			ts: REF_NOW - 4 * DAY,
			summary: 'Add "Why it matters" section',
			blocks: [],
		},
	],
	updatedAt: REF_NOW - 4 * DAY,
	contributors: ['Ada'],
}

const typography: Article = {
	id: 'a-typography',
	slug: 'typography',
	locale: 'en',
	title: 'Typography',
	summary:
		'Typography is the craft of arranging letters and text to make writing legible, readable, and appealing — on the page and on the screen.',
	categories: ['culture', 'technology'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 4,
		alt: 'Movable metal type arranged in a composing stick',
		caption: 'Movable type, the technology that industrialised the written word.',
		credit: 'Illustration',
	},
	infobox: [
		{ label: 'Field', value: 'Design' },
		{ label: 'Key measure', value: '45–75 characters/line' },
		{ label: 'Origin', value: 'c. 1440 (movable type)' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'Typography governs how text feels to read. Good typography is invisible: it lets the reader absorb meaning without noticing the letterforms carrying it.',
				),
			),
		},
		{ id: 'h-measure', type: 'heading', level: 2, text: 'Measure and rhythm' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t('The '),
				em('measure'),
				t(
					' — the length of a line — strongly affects reading comfort. A widely cited guideline keeps lines to ',
				),
				b('45–75 characters'),
				note(
					' Including spaces; roughly 2–3 lowercase alphabets.',
					'Robert Bringhurst suggests 66 characters as an ideal for single-column text.',
				),
				cite(
					', long enough for flow but short enough that the eye finds the next line easily.',
					'c2',
				),
			),
		},
		{
			id: 'callout-1',
			type: 'callout',
			variant: 'note',
			title: 'Reading tip',
			runs: p(
				t(
					'If a paragraph feels tiring, the line is probably too long before the measure is too small.',
				),
			),
		},
		{ id: 'h-screen', type: 'heading', level: 2, text: 'Type on screens' },
		{
			id: 'p3',
			type: 'paragraph',
			runs: p(
				t(
					'On the web, typography must adapt to any viewport and honour reader preferences — text size, dark mode, and reduced motion. It is closely tied to ',
				),
				link('hypertext', 'hypertext'),
				t(', where links interrupt the reading flow and must be styled with care.'),
			),
		},
		{
			id: 'quote-1',
			type: 'quote',
			runs: p(t('Typography exists to honour content.')),
			attribution: 'Robert Bringhurst',
		},
	],
	citations: [C.bringhurst],
	revisions: [
		{
			id: 'r1',
			author: 'Dieter',
			ts: REF_NOW - 60 * DAY,
			summary: 'Initial draft',
			blocks: [],
		},
		{
			id: 'r2',
			author: 'Ada',
			ts: REF_NOW - 9 * DAY,
			summary: 'Add measure section + quote',
			blocks: [],
		},
	],
	updatedAt: REF_NOW - 9 * DAY,
	contributors: ['Dieter', 'Ada'],
}

const hypertext: Article = {
	id: 'a-hypertext',
	slug: 'hypertext',
	locale: 'en',
	title: 'Hypertext',
	summary:
		'Hypertext is text displayed with references — links — that the reader can follow immediately, forming a non-linear web of documents.',
	categories: ['technology', 'history'],
	infobox: [
		{ label: 'Coined by', value: 'Ted Nelson (1965)' },
		{ label: 'Realised in', value: 'The World Wide Web' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t('The term '),
				b('hypertext'),
				cite(
					' was coined by Ted Nelson in 1965 for writing that branches and allows choices to the reader.',
					'c3',
				),
			),
		},
		{ id: 'h-idea', type: 'heading', level: 2, text: 'The idea' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t(
					'Rather than a single linear sequence, hypertext lets a reader jump between related passages — much like the ',
				),
				link('typography', 'typography'),
				t(
					' of a well-made reference book invites scanning rather than cover-to-cover reading.',
				),
			),
		},
		{
			id: 'list-1',
			type: 'list',
			ordered: false,
			items: [
				p(b('Nodes'), t(' — the documents or passages.')),
				p(b('Links'), t(' — the navigable references between them.')),
				p(b('Backlinks'), t(' — knowing what points back at a node.')),
			],
		},
	],
	citations: [C.nelson],
	revisions: [
		{ id: 'r1', author: 'Bruno', ts: REF_NOW - 20 * DAY, summary: 'Initial draft', blocks: [] },
	],
	updatedAt: REF_NOW - 20 * DAY,
	contributors: ['Bruno'],
}

const honeybee: Article = {
	id: 'a-honeybee',
	slug: 'honeybee',
	locale: 'en',
	title: 'Honeybee',
	summary:
		'Honeybees are social insects that live in colonies of tens of thousands, famous for producing honey and for pollinating a large share of the crops people eat.',
	categories: ['nature', 'science'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 1,
		alt: 'A honeybee on a yellow flower',
		caption: 'A worker honeybee foraging for nectar and pollen.',
		credit: 'Illustration',
	},
	infobox: [
		{ label: 'Colony size', value: '20,000–80,000' },
		{ label: 'Roles', value: 'Queen, workers, drones' },
		{ label: 'Communication', value: 'Waggle dance' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'A honeybee colony behaves almost like a single organism, coordinating foraging, defence, and reproduction through chemical and behavioural signals.',
				),
			),
		},
		{ id: 'h-dance', type: 'heading', level: 2, text: 'The waggle dance' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t(
					'Foragers communicate the direction and distance of food by dancing on the comb — a discovery that reshaped how biologists think about animal communication.',
				),
				note(
					' The angle of the dance encodes direction relative to the sun.',
					'Karl von Frisch received a Nobel Prize in 1973 for decoding the dance.',
				),
			),
		},
		{
			id: 'callout-1',
			type: 'callout',
			variant: 'warning',
			title: 'Conservation',
			runs: p(
				t(
					'Pollinator decline threatens food systems worldwide; habitat and pesticide pressures are leading causes.',
				),
			),
		},
		{ id: 'h-gallery', type: 'heading', level: 2, text: 'Hives and pollinators' },
		{
			id: 'gallery-1',
			type: 'gallery',
			// Deliberately mixed caption/credit presence (unlike every pre-existing figure in this
			// file, which sets all three) — exercises GalleryNodeView.svelte's conditional figcaption
			// rendering (caption-only, credit-only, both, neither) rather than an oversight.
			items: [
				{
					id: 'gal-brood',
					alt: 'A honeybee worker tending capped brood cells on a comb frame',
					caption: 'A nurse bee tends capped brood within the comb.',
					credit: 'Illustration',
					tone: 0,
					ratio: 4 / 3,
				},
				{
					id: 'gal-langstroth',
					alt: 'A wooden Langstroth hive box standing in an apiary',
					tone: 2,
				},
				{
					id: 'gal-forager',
					alt: 'A honeybee dusted with pollen visiting an apple blossom',
					caption: 'A forager collects pollen while visiting an orchard in bloom.',
					tone: 3,
					ratio: 1,
				},
				{
					id: 'gal-beekeeper',
					alt: 'A beekeeper inspecting a hive frame in protective gear',
					caption: 'Routine inspections help keep a colony healthy through the season.',
					credit: 'Illustration',
					tone: 5,
					// Portrait (taller than wide) — this gallery otherwise only has landscape (4:3),
					// square (1:1), and the unset-ratio 16:9 default. Exercises the actual case
					// GALLERY_CARD_MAX_HEIGHT (figureVisual.ts) exists for — a card taller than it is
					// wide, capped instead of growing to dominate the page.
					ratio: 3 / 4,
				},
			],
		},
		{
			id: 'h-society',
			type: 'heading',
			level: 2,
			text: 'A society of thousands',
		},
		{
			id: 'p3',
			type: 'paragraph',
			runs: p(
				cite(
					'Collective decisions — such as choosing a new nest site — emerge from many bees each assessing options and competing to recruit others, a process studied in depth by Thomas Seeley.',
					'c4',
				),
			),
		},
	],
	citations: [C.seeley],
	revisions: [
		{ id: 'r1', author: 'Chen', ts: REF_NOW - 30 * DAY, summary: 'Initial draft', blocks: [] },
		{
			id: 'r2',
			author: 'Dieter',
			ts: REF_NOW - 5 * DAY,
			summary: 'Add waggle-dance section',
			blocks: [],
		},
	],
	updatedAt: REF_NOW - 5 * DAY,
	contributors: ['Chen', 'Dieter'],
}

const tea: Article = {
	id: 'a-tea',
	slug: 'tea',
	locale: 'en',
	title: 'Tea',
	summary:
		'Tea is an aromatic beverage made by steeping the cured leaves of Camellia sinensis in hot water — after water, the most widely consumed drink in the world.',
	categories: ['culture', 'nature'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 3,
		alt: 'A cup of tea beside loose leaves',
		caption: 'Loose-leaf tea and a freshly poured cup.',
		credit: 'Illustration',
	},
	infobox: [
		{ label: 'Plant', value: 'Camellia sinensis' },
		{ label: 'Main types', value: 'Green, black, oolong, white' },
		{ label: 'Origin', value: 'East Asia' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'All true teas come from one plant; the differences between green, black, and oolong arise from how the leaves are processed after picking.',
				),
			),
		},
		{ id: 'h-types', type: 'heading', level: 2, text: 'Types by oxidation' },
		{
			id: 'table-1',
			type: 'table',
			headers: ['Type', 'Oxidation', 'Character'],
			rows: [
				['Green', 'Minimal', 'Fresh, grassy'],
				['Oolong', 'Partial', 'Floral, complex'],
				['Black', 'Full', 'Malty, robust'],
				['White', 'Very low', 'Delicate, subtle'],
			],
		},
		{ id: 'h-brew', type: 'heading', level: 2, text: 'Brewing' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t(
					'Water temperature matters: green teas prefer cooler water (around 80 °C), while black teas are brewed near boiling. Over-steeping draws out bitterness.',
				),
			),
		},
	],
	citations: [],
	revisions: [
		{ id: 'r1', author: 'Ada', ts: REF_NOW - 15 * DAY, summary: 'Initial draft', blocks: [] },
	],
	updatedAt: REF_NOW - 15 * DAY,
	contributors: ['Ada'],
}

const waterCycle: Article = {
	id: 'a-water-cycle',
	slug: 'water-cycle',
	locale: 'en',
	title: 'Water cycle',
	summary:
		'The water cycle is the continuous journey of water as it evaporates, condenses into clouds, falls as precipitation, and flows back to the sea.',
	categories: ['science', 'nature'],
	infobox: [
		{ label: 'Also called', value: 'Hydrologic cycle' },
		{ label: 'Driver', value: 'Solar energy' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'Driven by the sun, water moves endlessly between ocean, atmosphere, and land — never created or destroyed, only relocated.',
				),
			),
		},
		{ id: 'h-steps', type: 'heading', level: 2, text: 'Main stages' },
		{
			id: 'list-1',
			type: 'list',
			ordered: true,
			items: [
				p(b('Evaporation'), t(' — the sun turns surface water to vapour.')),
				p(b('Condensation'), t(' — vapour cools into clouds.')),
				p(b('Precipitation'), t(' — water falls as rain or snow.')),
				p(b('Collection'), t(' — it gathers in rivers, lakes, and oceans.')),
			],
		},
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t('Plants participate too, releasing vapour through '),
				em('transpiration'),
				t(' — closely tied to '),
				link('photosynthesis', 'photosynthesis'),
				t('.'),
			),
		},
	],
	citations: [],
	revisions: [
		{ id: 'r1', author: 'Bruno', ts: REF_NOW - 25 * DAY, summary: 'Initial draft', blocks: [] },
	],
	updatedAt: REF_NOW - 25 * DAY,
	contributors: ['Bruno'],
}

const astrolabe: Article = {
	id: 'a-astrolabe',
	slug: 'astrolabe',
	locale: 'en',
	title: 'Astrolabe',
	summary:
		'An astrolabe is an ancient instrument that models the sky, used for centuries to tell time, locate stars, and navigate by the heavens.',
	categories: ['history', 'science'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 5,
		alt: 'A brass astrolabe with engraved star positions',
		caption: 'A brass planispheric astrolabe.',
		credit: 'Illustration',
	},
	infobox: [
		{ label: 'Use', value: 'Astronomy, timekeeping' },
		{ label: 'Heyday', value: 'c. 800–1600 CE' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'The astrolabe is a flattened model of the celestial sphere. By aligning it with a star, a user could read off the time, latitude, or the star’s altitude.',
				),
			),
		},
		{ id: 'h-how', type: 'heading', level: 2, text: 'How it works' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t(
					'Rotating parts represent the daily turning of the sky over a fixed plate for the observer’s latitude — an analogue computer of remarkable elegance.',
				),
			),
		},
	],
	citations: [],
	revisions: [
		{ id: 'r1', author: 'Chen', ts: REF_NOW - 50 * DAY, summary: 'Initial draft', blocks: [] },
	],
	updatedAt: REF_NOW - 50 * DAY,
	contributors: ['Chen'],
}

// ── multilingual variant (demonstrates language switch + staleness) ───────────────
const typographyDe: Article = {
	...typography,
	locale: 'de',
	// drop the English lead/infobox inherited from the spread (avoid mixed-language chrome).
	lead: undefined,
	infobox: undefined,
	title: 'Typografie',
	summary:
		'Typografie ist die Kunst, Buchstaben und Text so anzuordnen, dass Geschriebenes gut lesbar und ansprechend wird — auf Papier und am Bildschirm.',
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'Typografie bestimmt, wie sich Text beim Lesen anfühlt. Gute Typografie ist unsichtbar.',
				),
			),
		},
		{ id: 'h-measure', type: 'heading', level: 2, text: 'Zeilenlänge und Rhythmus' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t(
					'Die Zeilenlänge beeinflusst den Lesekomfort stark. Eine gängige Faustregel hält Zeilen bei ',
				),
				b('45–75 Zeichen'),
				t('.'),
			),
		},
	],
	i18n: { sourceHash: 'stale-demo', status: 'stale' },
	// own (empty) revision list — history is tracked on the en source, and the spread
	// would otherwise alias the source's array (leaking English revision blocks here).
	revisions: [],
	contributors: ['Dieter'],
	updatedAt: REF_NOW - 40 * DAY,
}

const teaDe: Article = {
	...tea,
	locale: 'de',
	lead: undefined,
	infobox: undefined,
	title: 'Tee',
	summary:
		'Tee ist ein aromatisches Getränk aus den Blättern von Camellia sinensis — nach Wasser das meistgetrunkene Getränk der Welt.',
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'Alle echten Tees stammen von einer Pflanze; die Unterschiede entstehen durch die Verarbeitung der Blätter.',
				),
			),
		},
		{ id: 'h-types', type: 'heading', level: 2, text: 'Sorten nach Oxidation' },
	],
	i18n: { sourceHash: 'machine-demo', status: 'machine' },
	revisions: [],
	contributors: ['Ada'],
	updatedAt: REF_NOW - 14 * DAY,
}

// A long, fact-dense article — deliberately a 20-row infobox + many sections, a stress fixture
// for the reading layout (QuickFacts' desktop max-height/fade/"Show more" and a long ToC in the
// right panel) rather than a topic pick with any narrative significance.
const romanEmpire: Article = {
	id: 'a-roman-empire',
	slug: 'roman-empire',
	locale: 'en',
	title: 'Roman Empire',
	summary:
		'The Roman Empire was the post-Republic period of ancient Rome, spanning roughly five centuries in the west and fifteen in the east, and one of the largest empires in world history.',
	categories: ['history', 'culture'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 4,
		alt: 'Ruins of a Roman triumphal arch against a blue sky',
		caption: 'A Roman triumphal arch, built to commemorate a military victory.',
		credit: 'Illustration',
	},
	infobox: [
		{ label: 'Capital', value: 'Rome (27 BCE–330 CE); Constantinople (330–1453 CE)' },
		{ label: 'Founded', value: '27 BCE (Augustus becomes emperor)' },
		{ label: 'Fell (West)', value: '476 CE' },
		{ label: 'Fell (East)', value: '1453 CE' },
		{ label: 'Government', value: 'Autocratic empire' },
		{ label: 'Official language', value: 'Latin' },
		{ label: 'Common languages', value: 'Greek, Latin, regional languages' },
		{ label: 'Religion (early)', value: 'Roman polytheism' },
		{ label: 'Religion (later)', value: 'Christianity (state religion, 380 CE)' },
		{ label: 'Currency', value: 'Denarius, solidus' },
		{ label: 'Area (peak, c. 117 CE)', value: '~5,000,000 km²' },
		{ label: 'Population (peak)', value: '~60–70 million' },
		{ label: 'Legal system', value: 'Roman law' },
		{ label: 'Preceding state', value: 'Roman Republic' },
		{ label: 'Succeeding state (West)', value: 'Various successor kingdoms' },
		{ label: 'Succeeding state (East)', value: 'Byzantine Empire' },
		{ label: 'Notable rulers', value: 'Augustus, Trajan, Constantine, Justinian' },
		{ label: 'Major roads', value: 'Via Appia, Via Egnatia' },
		{ label: 'Major cities', value: 'Rome, Alexandria, Antioch, Constantinople' },
		{ label: 'Legacy', value: 'Law, language, architecture, calendar' },
	],
	blocks: [
		{
			id: 'p1',
			type: 'paragraph',
			runs: p(
				t(
					'At its height under Trajan, the empire controlled territory across three continents, from Britain to the edge of Persia and from the Rhine to North Africa.',
				),
			),
		},
		{ id: 'h-founding', type: 'heading', level: 2, text: 'Founding' },
		{
			id: 'p2',
			type: 'paragraph',
			runs: p(
				t('The empire began when Octavian, later known as '),
				b('Augustus'),
				t(
					", consolidated power after decades of civil war and became Rome's first emperor in 27 BCE, ending the Republic in all but name.",
				),
				note(
					' The Senate formally granted Octavian the title "Augustus" in January 27 BCE.',
					'The date is conventionally used to mark the start of the imperial period.',
				),
			),
		},
		{ id: 'h-government', type: 'heading', level: 2, text: 'Government and administration' },
		{
			id: 'p3',
			type: 'paragraph',
			runs: p(
				t(
					'Power centered on the emperor, but day-to-day rule leaned on a professional bureaucracy, provincial governors, and a standing legal code that bound citizens across the empire.',
				),
			),
		},
		{ id: 'h-provinces', type: 'heading', level: 3, text: 'Provinces' },
		{
			id: 'p4',
			type: 'paragraph',
			runs: p(
				t(
					"Conquered territory was organized into provinces, each governed on the emperor's behalf and taxed to fund the military and public works.",
				),
			),
		},
		{ id: 'h-military', type: 'heading', level: 2, text: 'Military' },
		{
			id: 'p5',
			type: 'paragraph',
			runs: p(
				cite(
					"The legions — professional, salaried soldiers serving fixed terms — were both the empire's conquering force and, in later centuries, a frequent kingmaker in imperial succession crises.",
					'c5',
				),
			),
		},
		{ id: 'h-economy', type: 'heading', level: 2, text: 'Economy and trade' },
		{
			id: 'p6',
			type: 'paragraph',
			runs: p(
				t(
					'A dense network of roads and shipping lanes tied the Mediterranean into a single trading zone, moving grain, wine, olive oil, and manufactured goods between provinces.',
				),
			),
		},
		{
			id: 'list-roads',
			type: 'list',
			ordered: false,
			items: [
				p(t('Via Appia — Rome to the south of Italy')),
				p(t('Via Egnatia — the Adriatic to the Bosphorus')),
				p(t('Extensive river and sea shipping routes')),
			],
		},
		{ id: 'h-religion', type: 'heading', level: 2, text: 'Religion' },
		{
			id: 'p7',
			type: 'paragraph',
			runs: p(
				t(
					"Early emperors were officially venerated alongside a pantheon of traditional gods; by the late 4th century, Christianity had become the empire's state religion under Theodosius I.",
				),
			),
		},
		{ id: 'h-culture', type: 'heading', level: 2, text: 'Culture and society' },
		{
			id: 'p8',
			type: 'paragraph',
			runs: p(
				t(
					'Roman society ran on a strict hierarchy of citizens, freedmen, and enslaved people, but its cities shared a common civic culture of baths, amphitheaters, forums, and public games.',
				),
			),
		},
		{
			id: 'callout-1',
			type: 'callout',
			variant: 'info',
			title: "Latin's long shadow",
			runs: p(
				t(
					'Latin evolved into the Romance languages (Italian, French, Spanish, Portuguese, Romanian) and remained the language of scholarship in Europe for over a thousand years after the empire fell.',
				),
			),
		},
		{ id: 'h-decline', type: 'heading', level: 2, text: 'Decline and fall' },
		{
			id: 'p9',
			type: 'paragraph',
			runs: p(
				t(
					'The empire split into western and eastern halves for administration in 285 CE. The Western Roman Empire fell to Germanic successor kingdoms in 476 CE, while the Eastern half — the Byzantine Empire — endured for nearly a thousand years more.',
				),
			),
		},
		{
			id: 'h-decline-causes',
			type: 'heading',
			level: 3,
			text: 'Contested causes',
		},
		{
			id: 'p10',
			type: 'paragraph',
			runs: p(
				cite(
					'Historians dispute how much weight to give any single cause — military overextension, economic strain, political instability, and external pressure from migrating peoples are all cited, and the debate remains active.',
					'c6',
				),
			),
		},
		{ id: 'h-legacy', type: 'heading', level: 2, text: 'Legacy' },
		{
			id: 'p11',
			type: 'paragraph',
			runs: p(
				t(
					'Roman law, engineering, architecture, and the Latin calendar all persisted long after the empire itself, shaping European and Mediterranean institutions well into the modern era.',
				),
			),
		},
	],
	citations: [
		{
			id: 'c5',
			title: 'The Roman Army at War',
			authors: 'Goldsworthy, A.',
			year: 1996,
			publisher: 'Oxford University Press',
		},
		{
			id: 'c6',
			title: 'The Fall of Rome: And the End of Civilization',
			authors: 'Ward-Perkins, B.',
			year: 2005,
			publisher: 'Oxford University Press',
		},
	],
	revisions: [
		{
			id: 'r1',
			author: 'Marcus',
			ts: REF_NOW - 60 * DAY,
			summary: 'Initial draft',
			blocks: [],
		},
		{
			id: 'r2',
			author: 'Livia',
			ts: REF_NOW - 10 * DAY,
			summary: 'Expand decline and legacy sections',
			blocks: [],
		},
	],
	updatedAt: REF_NOW - 10 * DAY,
	contributors: ['Marcus', 'Livia'],
}

/** Every article (all locales). The store indexes these by slug + locale. */
export const articles: Article[] = [
	photosynthesis,
	photosynthesisSimple,
	typography,
	hypertext,
	honeybee,
	tea,
	waterCycle,
	astrolabe,
	romanEmpire,
	typographyDe,
	teaDe,
	raschpetzer,
]

/**
 * A progressively-refined earlier draft of the first content block — same `id`, different
 * signature — so the block reads as a growing text prefix across the revisions and
 * therefore diffs as `changed` on *each* transition, not only the last one. `frac` is the
 * fraction of the final text this draft retains (`< 1` for every non-final revision; the
 * final revision uses the full block). Text-based so it works for a single-run paragraph
 * or a heading, not only multi-run paragraphs.
 */
function draftOf(block: Block, frac: number): Block {
	if (block.type === 'paragraph' && block.runs.length > 0) {
		const full = block.runs.map((r) => r.text).join('')
		const keep = Math.round(full.length * frac)
		if (keep >= full.length || keep < 8) return block
		return { ...block, runs: [{ text: `${full.slice(0, keep).trimEnd()}…` }] }
	}
	if (block.type === 'heading') {
		const keep = Math.round(block.text.length * frac)
		if (keep >= block.text.length || keep < 4) return block
		return { ...block, text: `${block.text.slice(0, keep).trimEnd()}…` }
	}
	return block
}

// Synthesize a plausible edit history so a block-level (semantic) diff between
// consecutive revisions exercises every status — not just appends:
//   • growth: earlier revisions carry fewer trailing blocks → later revisions `add` them;
//   • refinement: the first content block is a progressively longer draft → each transition
//     `changes` it (draftOf keeps `(i + 1) / n` of the text at revision `i`, all of it at the end);
//   • pruning: every non-final revision carries the same transient work-in-progress block,
//     dropped in the final revision → it `removes` on the last transition.
// The latest revision equals the current blocks. Deterministic (no RNG). Applied to
// source (en) articles only; localized variants keep their own (empty) revision arrays.
const TRANSIENT: Block = {
	id: 'wip-draft',
	type: 'paragraph',
	runs: [{ text: 'Work-in-progress note, removed before publication.' }],
}
for (const a of articles) {
	if (a.locale !== 'en' || a.revisions.length === 0) continue
	const base = a.blocks
	const n = a.revisions.length
	a.revisions.forEach((rev, i) => {
		if (i === n - 1) {
			rev.blocks = base // latest revision == the current article
			return
		}
		const cut = Math.max(1, Math.round(((i + 1) / n) * base.length))
		const kept = base.slice(0, cut).map((blk, j) => (j === 0 ? draftOf(blk, (i + 1) / n) : blk))
		rev.blocks = [...kept, TRANSIENT]
	})
}
