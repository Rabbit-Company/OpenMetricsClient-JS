import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../src/Registry";
import { Counter } from "../src/openmetrics-client";

describe("Counter", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

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
});
