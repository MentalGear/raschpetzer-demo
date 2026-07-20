/**
 * Align a source (`en`) article's blocks with a translated locale's blocks by their
 * stable, cross-locale `id`. This powers a side-by-side translation view: each source
 * block is `translated` (a target block shares its id), `untranslated` (only the source
 * has it — the reader falls back to the source), or the target carries an extra block not
 * in the source (`added`). Pure TS, no DOM — the reading UX layer renders the result.
 *
 * Block *content* is intentionally not compared (a translated block SHOULD differ in
 * text); presence by id is the signal. Per-block staleness would need per-block source
 * hashes, which the demo model doesn't carry — article-level `i18n.status` conveys that.
 */
import type { Block } from '../data/types'

export type TransStatus = 'translated' | 'untranslated' | 'added'

export interface AlignedBlock {
	id: string
	status: TransStatus
	/** the `en` source block — present unless the target added a block of its own. */
	source?: Block
	/** the translated block — present unless the source block is untranslated. */
	target?: Block
}

export interface TransSummary {
	/** source blocks that have a translated counterpart. */
	translated: number
	/** source blocks with no counterpart (reader falls back to the source). */
	untranslated: number
	/** target-only blocks (present in the translation, absent from the source). */
	added: number
	/** source block count = translated + untranslated (the translatable surface). */
	total: number
}

/** Align `sourceBlocks` (en) with `targetBlocks` (a translated locale) by stable id. */
export function alignBlocks(sourceBlocks: Block[], targetBlocks: Block[]): AlignedBlock[] {
	const targetById = new Map(targetBlocks.map((b) => [b.id, b]))
	const sourceIds = new Set(sourceBlocks.map((b) => b.id))
	const rows: AlignedBlock[] = []

	// source order first (translated / untranslated, in reading order)…
	for (const source of sourceBlocks) {
		const target = targetById.get(source.id)
		if (target) rows.push({ id: source.id, status: 'translated', source, target })
		else rows.push({ id: source.id, status: 'untranslated', source })
	}
	// …then any target-only blocks (present in the translation, gone from the source).
	for (const target of targetBlocks) {
		if (!sourceIds.has(target.id)) rows.push({ id: target.id, status: 'added', target })
	}
	return rows
}

export function summarizeTranslation(rows: AlignedBlock[]): TransSummary {
	const translated = rows.filter((r) => r.status === 'translated').length
	const untranslated = rows.filter((r) => r.status === 'untranslated').length
	const added = rows.filter((r) => r.status === 'added').length
	return { translated, untranslated, added, total: translated + untranslated }
}
