import { describe, it, expect, vi } from 'vitest'
import { CommandRegistry } from './commands'
import type { Command } from '@kit/core'

const cmd = (id: string, extra: Partial<Command> = {}): Command => ({
	id,
	run: () => {},
	...extra,
})

describe('CommandRegistry', () => {
	it('registers and looks up single + array of commands', () => {
		const r = new CommandRegistry()
		r.register(cmd('a')).register([cmd('b'), cmd('c')])
		expect(r.has('a')).toBe(true)
		expect(r.get('b')?.id).toBe('b')
		expect(r.list().map((c) => c.id)).toEqual(['a', 'b', 'c'])
	})

	it('later registration overwrites an earlier id', () => {
		const r = new CommandRegistry()
		const first = vi.fn()
		const second = vi.fn()
		r.register(cmd('x', { run: first }))
		r.register(cmd('x', { run: second }))
		r.run('x')
		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledOnce()
	})

	it('run() invokes the handler with ctx', () => {
		const r = new CommandRegistry()
		const run = vi.fn()
		r.register(cmd('open', { run }))
		const ctx = { target: { id: 7 } }
		r.run('open', ctx)
		expect(run).toHaveBeenCalledWith(ctx)
	})

	it('run() is a no-op for an unknown id', () => {
		const r = new CommandRegistry()
		expect(() => r.run('nope')).not.toThrow()
	})

	it('run() does not invoke a handler disabled by `when`', () => {
		const r = new CommandRegistry()
		const run = vi.fn()
		r.register(cmd('del', { run, when: (c) => !c.readOnly }))
		r.run('del', { readOnly: true })
		expect(run).not.toHaveBeenCalled()
		r.run('del', { readOnly: false })
		expect(run).toHaveBeenCalledOnce()
	})

	it('isEnabled() reflects existence and the `when` predicate', () => {
		const r = new CommandRegistry()
		r.register(cmd('always'))
		r.register(cmd('cond', { when: (c) => !c.readOnly }))
		expect(r.isEnabled('always')).toBe(true)
		expect(r.isEnabled('missing')).toBe(false)
		expect(r.isEnabled('cond', { readOnly: true })).toBe(false)
		expect(r.isEnabled('cond', { readOnly: false })).toBe(true)
	})

	it('run() returns the handler promise for async commands', async () => {
		const r = new CommandRegistry()
		let resolved = false
		r.register(cmd('async', { run: async () => void (resolved = true) }))
		await r.run('async')
		expect(resolved).toBe(true)
	})
})
