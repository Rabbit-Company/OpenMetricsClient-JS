import { describe, expect, test } from "bun:test";
import { StateSet } from "../src/openmetrics-client";

describe("StateSet", () => {
	test("should track mutually exclusive states", () => {
		const states = new StateSet({
			name: "service_status",
			help: "Current service status",
			states: ["up", "degraded", "down"],
		});

		states.enableOnly("up");
		expect(states.getState("up")).toBe(true);

		states.enableOnly("degraded");
		expect(states.getState("degraded")).toBe(true);
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

		test("should allow resetting specific labeled states", () => {
			const states = new StateSet({
				name: "node_status",
				help: "",
				labelNames: ["node"],
				states: ["online", "offline"],
			});

			states.labels({ node: "1" }).enableOnly("online");
			states.labels({ node: "2" }).enableOnly("offline");
			states.labels({ node: "1" }).enableOnly("offline");

			const output = states.getMetric();
			expect(output).toInclude('node_status{node="1",node_status="offline"} 1');
			expect(output).toInclude('node_status{node="2",node_status="offline"} 1');
		});
	});
});
