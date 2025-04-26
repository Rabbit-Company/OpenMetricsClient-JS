import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../src/Registry";
import { Summary } from "../src/openmetrics-client";

describe("Summary", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

	test("should calculate quantiles", () => {
		const summary = new Summary({
			name: "duration",
			help: "",
			quantiles: [0.5, 0.9],
			registry,
		});

		for (let i = 1; i <= 100; i++) summary.observe(i);

		const output = registry.metricsText();
		expect(output).toInclude('duration{quantile="0.5"} 50');
		expect(output).toInclude('duration{quantile="0.9"} 90');
	});

	test("should respect maxAge", async () => {
		const summary = new Summary({
			name: "rolling",
			help: "",
			maxAgeSeconds: 1,
			ageBuckets: 5,
		});

		summary.observe(1);
		await new Promise((resolve) => setTimeout(resolve, 1200));
		expect(summary.getSnapshot().count).toBe(0);
	});

	describe("Summary Labels", () => {
		test("should maintain separate sliding windows per label set", async () => {
			const summary = new Summary({
				name: "processing_time",
				help: "",
				labelNames: ["job_type"],
				maxAgeSeconds: 1,
				ageBuckets: 2,
				registry,
			});

			summary.labels({ job_type: "import" }).observe(1.0);
			summary.labels({ job_type: "export" }).observe(2.0);

			await new Promise((resolve) => setTimeout(resolve, 600));

			summary.labels({ job_type: "import" }).observe(1.5);

			await new Promise((resolve) => setTimeout(resolve, 600));

			expect(summary.getSnapshot({ job_type: "import" }).count).toBe(1);
			expect(summary.getSnapshot({ job_type: "export" }).count).toBe(0);
		});

		test("should calculate quantiles per label set", () => {
			const summary = new Summary({
				name: "latency",
				help: "",
				labelNames: ["service"],
				quantiles: [0.5],
			});

			summary.labels({ service: "api" }).observe(10);
			summary.labels({ service: "db" }).observe(20);

			const output = summary.getMetric();
			expect(output).toInclude('latency{quantile="0.5",service="api"} 10');
			expect(output).toInclude('latency{quantile="0.5",service="db"} 20');
		});
	});
});
