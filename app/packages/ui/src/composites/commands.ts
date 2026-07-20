/**
 * Command registry + Svelte context wiring for the config-driven component API.
 *
 * The registry is a plain typed dispatcher (no runes): every behavior path —
 * context menus, toolbar, palette, keybindings — calls `run(id, ctx)`. The
 * reactivity lives in the *consuming* component's `ctx` + `$derived(resolveMenu(...))`,
 * not here, so the registry stays a simple, testable Map. See docs/kit/04.
 *
 * This module also specializes the generic `@kit/core` config types with the
 * Lucide icon component, which is the icon contract apps author against.
 */
import { getContext, setContext } from 'svelte'
import type { LucideIcon } from '@lucide/svelte'
import type {
	Command,
	CommandCtx,
	CommandId,
	MenuConfig as CoreMenuConfig,
	MenuItem as CoreMenuItem,
	NavConfig as CoreNavConfig,
	NavGroup as CoreNavGroup,
	NavItem as CoreNavItem,
} from '@kit/core'

/** The icon contract for kit config: a Lucide icon component. */
export type Icon = LucideIcon
export type MenuItem = CoreMenuItem<Icon>
export type MenuConfig = CoreMenuConfig<Icon>
export type NavItem = CoreNavItem<Icon>
export type NavGroup = CoreNavGroup<Icon>
export type NavConfig = CoreNavConfig<Icon>

/** A typed registry of commands; the single dispatch point for all behavior. */
export class CommandRegistry {
	#commands = new Map<CommandId, Command>()

	/** Register one or many commands (later ids overwrite earlier ones). */
	register(commands: Command | Command[]): this {
		for (const c of Array.isArray(commands) ? commands : [commands]) this.#commands.set(c.id, c)
		return this
	}

	has(id: CommandId): boolean {
		return this.#commands.has(id)
	}
	get(id: CommandId): Command | undefined {
		return this.#commands.get(id)
	}
	list(): Command[] {
		return [...this.#commands.values()]
	}

	/** True if the command exists and its `when` (if any) passes for `ctx`. */
	isEnabled(id: CommandId, ctx: CommandCtx = {}): boolean {
		const c = this.#commands.get(id)
		if (!c) return false
		return c.when ? c.when(ctx) : true
	}

	/** Run a command by id. No-op (with a dev warning) for unknown/disabled ids. */
	run(id: CommandId, ctx: CommandCtx = {}): void | Promise<void> {
		const c = this.#commands.get(id)
		if (!c) {
			if (import.meta.env.DEV) console.error(`[commands] unknown command: ${id}`)
			return
		}
		if (c.when && !c.when(ctx)) {
			if (import.meta.env.DEV) console.warn(`[commands] command disabled by \`when\`: ${id}`)
			return
		}
		return c.run(ctx)
	}
}

const KEY = Symbol.for('@kit/ui:commands')

/** Provide a registry from a parent component (call during init). Returns it. */
export function setCommandRegistry(registry: CommandRegistry): CommandRegistry {
	return setContext(KEY, registry)
}

/** Read the registry provided by an ancestor, or `undefined` if none was set. */
export function getCommandRegistryOptional(): CommandRegistry | undefined {
	return getContext<CommandRegistry | undefined>(KEY)
}

/** Read the registry provided by an ancestor; throws if none was set. */
export function getCommandRegistry(): CommandRegistry {
	const registry = getCommandRegistryOptional()
	if (!registry) {
		throw new Error(
			'[commands] no CommandRegistry in context — call setCommandRegistry() in a parent.',
		)
	}
	return registry
}
