import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../src/Registry";
import { Counter } from "../src/openmetrics-client";

describe("Registry", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

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
		new Counter({ name: "requests", help: "Total requests", registry });
		expect(registry.unregister("requests")).toBe(true);
	});

	test("should clear all metrics", () => {
		new Counter({ name: "temp", help: "", registry });
		registry.clear();
		expect(registry.metricsText()).toStartWith("\n# EOF");
	});
});
