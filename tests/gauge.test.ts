import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../src/Registry";
import { Gauge } from "../src/openmetrics-client";

describe("Gauge", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

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
});
