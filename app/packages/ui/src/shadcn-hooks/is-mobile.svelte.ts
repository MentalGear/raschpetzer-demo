// shadcn-svelte vendored hook (mirrors upstream — kept verbatim for CLI re-add):
// reactive `IsMobile` viewport check via a `max-width` MediaQuery (default 768px).
import { MediaQuery } from 'svelte/reactivity'

const DEFAULT_MOBILE_BREAKPOINT = 768

export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${breakpoint - 1}px`)
	}
}
