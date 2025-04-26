import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../../src/Registry";
import { Counter, Gauge } from "../../src/openmetrics-client";

describe("Registry Label Integration", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

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
