import { describe, expect, test } from "bun:test";
import { Unknown } from "../src/openmetrics-client";

describe("Unknown", () => {
	test("should track arbitrary numeric values", () => {
		const unknown = new Unknown({
			name: "custom_metric",
			help: "Custom tracking metric",
		});
		unknown.set(42);
		expect(unknown.get()).toBe(42);
	});

	describe("Unknown Labels", () => {
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

		test("should generate proper OpenMetrics output for labeled metrics", () => {
			const unknown = new Unknown({
				name: "temperature",
				help: "",
				labelNames: ["location"],
			});

			unknown.labels({ location: "kitchen" }).set(22.5);
			unknown.labels({ location: "bedroom" }).set(20.0);

			const output = unknown.getMetric();
			expect(output).toInclude('temperature{location="kitchen"} 22.5');
			expect(output).toInclude('temperature{location="bedroom"} 20');
		});
	});
});
