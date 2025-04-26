import { describe, expect, test } from "bun:test";
import { Counter, Gauge } from "../../src/openmetrics-client";

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
