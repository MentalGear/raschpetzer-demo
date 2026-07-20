import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	// The editor is a heavy, lazily-imported chunk (TipTap + ProseMirror); under Vite dev
	// the FIRST test to mount it pays a cold on-demand compile that can exceed the default
	// 30s per-test budget. Give headroom so that latency isn't misread as a failure.
	timeout: 60_000,
	reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
	expect: {
		toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
	},
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		ignoreHTTPSErrors: true,
	},
	projects: [
		{
			name: 'chromium',
			testIgnore: '**/*.mobile.spec.ts',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: { args: ['--ignore-certificate-errors', '--no-sandbox'] },
			},
		},
		{
			// Phone-viewport project — mobile-friendliness audit (docs/backlog.md "Mobile & responsive").
			// Chromium-based device (Pixel 7) so it reuses the already-installed browser; no webkit needed.
			name: 'mobile',
			testMatch: '**/*.mobile.spec.ts',
			use: {
				...devices['Pixel 7'],
				launchOptions: { args: ['--ignore-certificate-errors', '--no-sandbox'] },
			},
		},
	],
	webServer: {
		command: 'bun dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
	},
})
