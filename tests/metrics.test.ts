import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../src/Registry";
import { Counter, Gauge, GaugeHistogram, Histogram, Info, StateSet, Summary, Unknown } from "../src/openmetrics-client";

describe("Metrics Library - Label Implementation Tests", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

	describe("Counter Labels", () => {
		test("should track multiple labeled counters independently", () => {
			const counter = new Counter({
				name: "requests",
				help: "Total requests",
				labelNames: ["method", "status"],
				registry,
			});

			counter.labels({ method: "GET", status: "200" }).inc();
			counter.labels({ method: "POST", status: "500" }).inc(3);

			expect(counter.get({ method: "GET", status: "200" }).value).toBe(1);
			expect(counter.get({ method: "POST", status: "500" }).value).toBe(3);
		});

		test("should reset specific labeled counters", () => {
			const counter = new Counter({
				name: "errors",
				help: "",
				labelNames: ["service"],
			});

			counter.labels({ service: "api" }).inc();
			counter.labels({ service: "db" }).inc(2);
			counter.reset({ service: "api" });

			expect(counter.get({ service: "api" }).value).toBe(0);
			expect(counter.get({ service: "db" }).value).toBe(2);
		});
	});

	describe("Gauge Labels", () => {
		test("should maintain separate gauge values per label set", () => {
			const gauge = new Gauge({
				name: "temperature",
				help: "",
				labelNames: ["location"],
				registry,
			});

			gauge.labels({ location: "kitchen" }).set(22.5);
			gauge.labels({ location: "bedroom" }).set(20.0);

			expect(gauge.get({ location: "kitchen" })?.value).toBe(22.5);
			expect(gauge.get({ location: "bedroom" })?.value).toBe(20.0);
		});

		test("should handle increment/decrement with labels", () => {
			const gauge = new Gauge({
				name: "connections",
				help: "",
				labelNames: ["server"],
			});

			gauge.labels({ server: "primary" }).inc();
			gauge.labels({ server: "secondary" }).inc(3);
			gauge.labels({ server: "primary" }).dec();

			expect(gauge.get({ server: "primary" })?.value).toBe(0);
			expect(gauge.get({ server: "secondary" })?.value).toBe(3);
		});
	});

	describe("Summary Labels", () => {
		test("should maintain separate sliding windows per label set", async () => {
			const summary = new Summary({
				name: "processing_time",
				help: "",
				labelNames: ["job_type"],
				maxAgeSeconds: 1,
				ageBuckets: 2,
			});

			summary.labels({ job_type: "import" }).observe(1.0);
			summary.labels({ job_type: "export" }).observe(2.0);

			await new Promise((resolve) => setTimeout(resolve, 600));

			summary.labels({ job_type: "import" }).observe(1.5);

			await new Promise((resolve) => setTimeout(resolve, 600));

			expect(summary.getSnapshot({ job_type: "import" }).count).toBe(1);
			expect(summary.getSnapshot({ job_type: "export" }).count).toBe(0);
		});
	});

	describe("Info Labels", () => {
		test("should track multiple info metrics with labels", () => {
			const info = new Info({
				name: "build_info",
				help: "Build information",
				labelNames: ["version", "commit"],
			});

			info.labels({ version: "1.0.0", commit: "abc123" }).set();
			info.labels({ version: "2.0.0", commit: "def456" }).set();

			const output = info.getMetric();
			expect(output).toInclude('build_info_info{commit="abc123",version="1.0.0"} 1');
			expect(output).toInclude('build_info_info{commit="def456",version="2.0.0"} 1');
		});
	});

	describe("StateSet Labels", () => {
		test("should manage states independently per label set", () => {
			const states = new StateSet({
				name: "service_state",
				help: "",
				labelNames: ["service"],
				states: ["active", "degraded", "offline"],
			});

			states.labels({ service: "api" }).enableOnly("active");
			states.labels({ service: "db" }).enableOnly("degraded");

			const output = states.getMetric();
			expect(output).toInclude('service_state{service="api",service_state="active"} 1');
			expect(output).toInclude('service_state{service="db",service_state="degraded"} 1');
			expect(output).toInclude('service_state{service="api",service_state="offline"} 0');
		});
	});

	describe("Unknown Metric Labels", () => {
		test("should track arbitrary values with labels", () => {
			const unknown = new Unknown({
				name: "custom_metric",
				help: "",
				labelNames: ["category"],
			});

			unknown.labels({ category: "a" }).set(42);
			unknown.labels({ category: "b" }).set(3.14);

			expect(unknown.get({ category: "a" })).toBe(42);
			expect(unknown.get({ category: "b" })).toBe(3.14);
		});
	});

	describe("Label Validation", () => {
		test("should reject invalid label names", () => {
			expect(() => {
				new Counter({
					name: "invalid",
					help: "",
					labelNames: ["valid", "invalid-name"],
				});
			}).toThrow("Invalid label name");
		});

		test("should require all label names to be provided", () => {
			const counter = new Counter({
				name: "test",
				help: "",
				labelNames: ["required1", "required2"],
			});

			expect(() => {
				counter.labels({ required1: "value" });
			}).toThrow("Missing label");
		});

		test("should reject extra labels not declared in labelNames", () => {
			const gauge = new Gauge({
				name: "test",
				help: "",
				labelNames: ["allowed"],
			});

			expect(() => {
				gauge.labels({ allowed: "yes", extra: "no" });
			}).toThrow("Unexpected label");
		});
	});

	describe("Registry Integration", () => {
		test("should properly format labeled metrics in registry output", () => {
			const counter = new Counter({
				name: "hits",
				help: "Page hits",
				labelNames: ["page"],
				registry,
			});

			counter.labels({ page: "home" }).inc();
			counter.labels({ page: "about" }).inc(2);

			const output = registry.metricsText();
			expect(output).toInclude('test_hits_total{page="home"} 1');
			expect(output).toInclude('test_hits_total{page="about"} 2');
			expect(output).toInclude('test_hits_created{page="home"}');
			expect(output).toInclude('test_hits_created{page="about"}');
		});

		test("should handle unregistering labeled metrics", () => {
			const gauge = new Gauge({
				name: "pressure",
				help: "",
				labelNames: ["sensor"],
				registry,
			});

			gauge.labels({ sensor: "A1" }).set(100);
			expect(registry.unregister("pressure")).toBe(true);
			expect(registry.metricsText()).not.toInclude("pressure");
		});
	});
});

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

		test("should remove metric", () => {
			new Counter({
				name: "requests",
				help: "Total requests",
				registry,
			});

			expect(registry.unregister("requests")).toBe(true);
		});

		test("should clear all metrics", () => {
			new Counter({ name: "temp", help: "", registry });
			registry.clear();
			expect(registry.metricsText()).toStartWith("\n# EOF");
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
			expect(gauge.get()?.value).toBe(42);
		});

		test("should handle timestamps", () => {
			const gauge = new Gauge({ name: "time", help: "" });
			gauge.set(1);
			const data = gauge.get();
			expect(data?.updated).toBeInstanceOf(Date);
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
				labelNames: ["method", "status"],
				registry,
			});
			counter.labels({ method: "POST", status: "200" }).inc();
			const output = registry.metricsText();
			expect(output).toInclude('login_attempts_total{method="POST",status="200"} 1');
		});

		test("should validate label names", () => {
			expect(() => {
				new Counter({
					name: "invalid",
					help: "",
					labelNames: ["invalid-label"],
				});
			}).toThrow("Invalid label name");
		});
	});

	describe("Unit Suffix Handling", () => {
		test("should append '_bytes' to name if unit is 'bytes' and name doesn't include it", () => {
			const gauge = new Gauge({
				name: "request_size",
				help: "Size of the request",
				unit: "bytes",
				registry,
			});

			gauge.set(0);

			const text = registry.metricsText();
			expect(text).toInclude("# TYPE test_request_size_bytes gauge");
			expect(text).toInclude("test_request_size_bytes 0");
		});
	});
});
