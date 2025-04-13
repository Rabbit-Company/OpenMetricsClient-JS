import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../src/Registry";
import { Counter, Gauge, GaugeHistogram, Histogram, Info, StateSet, Summary, Unknown } from "../src/openmetrics-client";

describe("Metrics Library", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

	describe("Registry", () => {
		test("should register metrics", () => {
			const counter = new Counter({
				name: "requests",
				help: "Total requests",
				registry,
			});

			expect(registry.metricsText()).toInclude("test_requests_total");
		});

		test("should reject duplicate metrics", () => {
			new Counter({ name: "dupe", help: "", registry });
			expect(() => {
				new Counter({ name: "dupe", help: "", registry });
			}).toThrow("already registered");
		});

		test("should clear all metrics", () => {
			new Counter({ name: "temp", help: "", registry });
			registry.clear();
			expect(registry.metricsText()).toEndWith("# EOF");
		});
	});

	describe("Counter", () => {
		test("should increment value", () => {
			const counter = new Counter({ name: "counter", help: "", registry });
			counter.inc();
			counter.inc(5);
			expect(counter.get().value).toBe(6);
		});

		test("should generate valid OpenMetrics", () => {
			const counter = new Counter({ name: "http_requests", help: "Requests", registry });
			counter.inc();
			const output = registry.metricsText();
			expect(output).toInclude("# TYPE test_http_requests counter");
			expect(output).toInclude("test_http_requests_total 1");
		});
	});

	describe("Gauge", () => {
		test("should set value directly", () => {
			const gauge = new Gauge({ name: "temp", help: "", registry });
			gauge.set(42);
			expect(gauge.get().value).toBe(42);
		});

		test("should handle timestamps", () => {
			const gauge = new Gauge({ name: "time", help: "" });
			gauge.set(1);
			const data = gauge.get();
			expect(data.updated).toBeInstanceOf(Date);
		});
	});

	describe("Histogram", () => {
		test("should observe values", () => {
			const hist = new Histogram({ name: "latency", help: "", registry });
			[0.1, 0.2, 0.3].forEach((v) => hist.observe(v));
			expect(hist.getSnapshot().count).toBe(3);
		});

		test("should calculate buckets", () => {
			const hist = new Histogram({
				name: "size",
				help: "",
				buckets: [1, 2, 3],
			});
			[0.5, 1.5, 2.5, 10].forEach((v) => hist.observe(v));
			const output = hist.getMetric();
			expect(output).toInclude('size_bucket{le="1"} 1');
			expect(output).toInclude('size_bucket{le="+Inf"} 4');
		});
	});

	describe("Summary", () => {
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
			await new Promise((resolve) => setTimeout(resolve, 1200)); // Wait longer than maxAge
			expect(summary.getSnapshot().count).toBe(0); // Should have rotated out
		});
	});

	describe("Labels", () => {
		test("should handle labeled metrics", () => {
			const counter = new Counter({
				name: "login_attempts",
				help: "",
				labels: { method: "POST", status: "200" },
				registry,
			});
			counter.inc();
			const output = registry.metricsText();
			expect(output).toInclude('login_attempts_total{method="POST",status="200"} 1');
		});

		test("should validate label names", () => {
			expect(() => {
				new Counter({
					name: "invalid",
					help: "",
					labels: { "invalid-label": "value" },
				});
			}).toThrow("Invalid label name");
		});
	});
});
