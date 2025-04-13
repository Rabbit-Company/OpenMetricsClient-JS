// src/Registry.ts
class Registry {
  metrics = new Map;
  prefix;
  autoRegister;
  constructor(options) {
    this.prefix = options?.prefix;
    this.autoRegister = options?.autoRegister ?? false;
  }
  getMetricKey(metric) {
    return `${metric.name}|${JSON.stringify(metric.labels)}`;
  }
  register(metric) {
    const key = this.getMetricKey(metric);
    if (this.metrics.has(key)) {
      throw new Error(`Metric with name ${metric.name} and labels ${JSON.stringify(metric.labels)} already registered`);
    }
    this.metrics.set(key, metric);
    if (this.autoRegister) {
      metric.registry = this;
    }
  }
  unregister(metric) {
    const key = this.getMetricKey(metric);
    return this.metrics.delete(key);
  }
  unregisterByName(name) {
    let count = 0;
    for (const [key, metric] of this.metrics) {
      if (metric.name === name) {
        this.metrics.delete(key);
        count++;
      }
    }
    return count;
  }
  getMetrics() {
    return Array.from(this.metrics.values());
  }
  getMetric(name, labels) {
    const tempMetric = { name, labels };
    return this.metrics.get(this.getMetricKey(tempMetric));
  }
  metricsText() {
    return Array.from(this.metrics.values()).map((m) => m.getMetric(this.prefix)).join(`
`) + `
# EOF`;
  }
  clear() {
    this.metrics.clear();
  }
}
// src/metrics/BaseMetric.ts
class BaseMetric {
  name;
  help;
  unit;
  labels;
  registry;
  constructor(options) {
    this.name = options.name;
    this.help = options.help;
    this.unit = options.unit;
    this.labels = options.labels || {};
    if (options.registry) {
      this.registry = options.registry;
      this.registry.register(this);
    }
  }
  validateLabels(labels) {
    if (!labels)
      return;
    for (const [key, value] of Object.entries(labels)) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid label name: ${key}`);
      }
      if (typeof value !== "string") {
        throw new Error(`Label value must be string for key: ${key}`);
      }
    }
  }
  getFullName(prefix) {
    return prefix ? `${prefix}_${this.name}` : this.name;
  }
  formatLabels(labels) {
    const allLabels = { ...this.labels, ...labels };
    if (Object.keys(allLabels).length === 0)
      return "";
    const labelStrings = Object.entries(allLabels).map(([k, v]) => `${k}="${escapeLabelValue(v)}"`);
    return `{${labelStrings.join(",")}}`;
  }
  metadata(type, prefix) {
    const fullName = this.getFullName(prefix);
    const lines = [`# TYPE ${fullName} ${type}`];
    if (this.unit) {
      lines.push(`# UNIT ${fullName} ${this.unit}`);
    }
    lines.push(`# HELP ${fullName} ${this.help}`);
    return lines.join(`
`);
  }
}
function escapeLabelValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
}

// src/metrics/Counter.ts
class Counter extends BaseMetric {
  value = 0;
  updated = Date.now();
  created = Date.now();
  constructor(options) {
    super(options);
    this.validateLabels(options.labels);
  }
  inc(amount = 1) {
    if (amount < 0 || !Number.isFinite(amount))
      return;
    this.value += amount;
    this.updated = Date.now();
  }
  get() {
    return {
      value: this.value,
      updated: new Date(this.updated),
      created: new Date(this.created)
    };
  }
  reset() {
    const changed = Date.now();
    this.value = 0;
    this.created = changed;
    this.updated = changed;
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const labels = this.formatLabels();
    const updatedTimestamp = this.updated / 1000;
    const createdTimestamp = this.created / 1000;
    return [
      this.metadata("counter", prefix),
      `${name}_total${labels} ${this.value} ${updatedTimestamp}`,
      `${name}_created${labels} ${createdTimestamp} ${updatedTimestamp}`
    ].join(`
`);
  }
}
// src/metrics/Gauge.ts
class Gauge extends BaseMetric {
  value = 0;
  updated = Date.now();
  constructor(options) {
    super(options);
    this.validateLabels(options.labels);
  }
  inc(amount = 1) {
    if (!Number.isFinite(amount))
      return;
    this.value += amount;
    this.updated = Date.now();
  }
  dec(amount = 1) {
    if (!Number.isFinite(amount))
      return;
    this.value -= amount;
    this.updated = Date.now();
  }
  set(value) {
    if (!Number.isFinite(value))
      return;
    this.value = value;
    this.updated = Date.now();
  }
  get() {
    return {
      value: this.value,
      updated: new Date(this.updated)
    };
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const labels = this.formatLabels();
    const updatedTimestamp = this.updated / 1000;
    return `${this.metadata("gauge", prefix)}
${name}${labels} ${this.value} ${updatedTimestamp}`;
  }
}
// src/metrics/Histogram.ts
class Histogram extends BaseMetric {
  buckets;
  counts;
  sum = 0;
  count = 0;
  updated = Date.now();
  created = Date.now();
  constructor(options) {
    super(options);
    this.validateLabels(options.labels);
    const defaultBuckets = [0.1, 0.5, 1, 5, 10];
    this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);
    if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
      throw new Error("Histogram buckets must be positive numbers");
    }
    this.counts = new Map([...this.buckets.map((b) => [b.toString(), 0]), ["+Inf", 0]]);
  }
  observe(value) {
    if (value < 0 || !Number.isFinite(value))
      return;
    this.count++;
    this.sum += value;
    this.updated = Date.now();
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        this.counts.set(bucket.toString(), (this.counts.get(bucket.toString()) ?? 0) + 1);
      }
    }
    this.counts.set("+Inf", (this.counts.get("+Inf") ?? 0) + 1);
  }
  reset() {
    this.count = 0;
    this.sum = 0;
    this.updated = Date.now();
    this.created = Date.now();
    for (const key of this.counts.keys()) {
      this.counts.set(key, 0);
    }
  }
  getMetric(prefix) {
    const fullName = this.getFullName(prefix);
    const labels = this.formatLabels();
    const lines = [this.metadata("histogram", prefix)];
    for (const bucket of this.buckets) {
      lines.push(`${fullName}_bucket{le="${bucket}"} ${this.counts.get(bucket.toString()) ?? 0}`);
    }
    lines.push(`${fullName}_bucket{le="+Inf"} ${this.counts.get("+Inf") ?? 0}`, `${fullName}_count ${this.count}`, `${fullName}_sum ${this.sum}`, `${fullName}_created ${this.created / 1000}`);
    return lines.join(`
`);
  }
  getSnapshot() {
    return {
      buckets: this.buckets,
      counts: this.counts,
      sum: this.sum,
      count: this.count,
      created: new Date(this.created),
      updated: new Date(this.updated)
    };
  }
}
// src/metrics/Summary.ts
class Summary extends BaseMetric {
  quantiles;
  maxAgeSeconds;
  ageBuckets;
  buckets;
  currentBucket;
  rotationInterval;
  sum = 0;
  count = 0;
  updated = Date.now();
  created = Date.now();
  isDestroyed = false;
  constructor(options) {
    super(options);
    this.quantiles = options.quantiles || [0.5, 0.9, 0.99];
    this.maxAgeSeconds = options.maxAgeSeconds || 600;
    this.ageBuckets = options.ageBuckets || 5;
    this.validateQuantiles();
    this.buckets = [];
    this.currentBucket = this.createBucket();
    this.rotationInterval = setInterval(() => this.rotateBuckets(), this.maxAgeSeconds * 1000 / this.ageBuckets);
    this.rotationInterval.unref?.();
  }
  createBucket() {
    return { values: [], sum: 0, count: 0, timestamp: Date.now() };
  }
  validateQuantiles() {
    for (const q of this.quantiles) {
      if (q <= 0 || q >= 1)
        throw new Error(`Quantile ${q} must be between 0 and 1`);
    }
  }
  rotateBuckets() {
    if (this.isDestroyed)
      return;
    this.buckets.push(this.currentBucket);
    const cutoff = Date.now() - this.maxAgeSeconds * 1000;
    this.buckets = this.buckets.filter((b) => b.timestamp >= cutoff);
    this.recalculateAggregates();
    this.currentBucket = this.createBucket();
    this.updated = Date.now();
  }
  recalculateAggregates() {
    this.sum = this.buckets.reduce((sum, b) => sum + b.sum, 0);
    this.count = this.buckets.reduce((count, b) => count + b.count, 0);
  }
  observe(value) {
    if (this.isDestroyed || !Number.isFinite(value) || value < 0)
      return;
    this.currentBucket.values.push(value);
    this.currentBucket.sum += value;
    this.currentBucket.count++;
    this.sum += value;
    this.count++;
    this.updated = Date.now();
  }
  reset() {
    this.buckets = [];
    this.currentBucket = this.createBucket();
    this.sum = 0;
    this.count = 0;
    this.updated = Date.now();
    this.created = Date.now();
  }
  getMetric(prefix) {
    const fullName = this.getFullName(prefix);
    const lines = [this.metadata("summary", prefix)];
    const createdTimestamp = this.created / 1000;
    const updatedTimestamp = this.updated / 1000;
    const allValues = this.buckets.concat([this.currentBucket]).flatMap((b) => b.values);
    if (allValues.length > 0) {
      const sortedValues = [...allValues].sort((a, b) => a - b);
      for (const q of this.quantiles) {
        const pos = q * (sortedValues.length - 1);
        const base = Math.floor(pos);
        const rest = pos - base;
        const value = base + 1 < sortedValues.length ? sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]) : sortedValues[base];
        lines.push(`${fullName}{quantile="${q}"} ${value}`);
      }
    } else {
      for (const q of this.quantiles) {
        lines.push(`${fullName}{quantile="${q}"} NaN`);
      }
    }
    lines.push(`${fullName}_sum ${this.sum}`, `${fullName}_count ${this.count}`, `${fullName}_created ${createdTimestamp}`);
    return lines.join(`
`);
  }
  getSnapshot() {
    return {
      sum: this.sum,
      count: this.count,
      buckets: this.buckets.length,
      currentBucketSize: this.currentBucket.values.length,
      maxAgeSeconds: this.maxAgeSeconds,
      updated: new Date(this.updated),
      created: new Date(this.created)
    };
  }
  destroy() {
    if (this.isDestroyed)
      return;
    this.isDestroyed = true;
    clearInterval(this.rotationInterval);
    this.reset();
  }
}
// src/metrics/GaugeHistogram.ts
class GaugeHistogram extends BaseMetric {
  buckets;
  counts;
  sum = 0;
  count = 0;
  updated = Date.now();
  created = Date.now();
  constructor(options) {
    super(options);
    this.validateLabels(options.labels);
    const defaultBuckets = [0.1, 0.5, 1, 5, 10];
    this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);
    if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
      throw new Error("GaugeHistogram buckets must be positive numbers");
    }
    this.counts = new Map([...this.buckets.map((b) => [b.toString(), 0]), ["+Inf", 0]]);
  }
  observe(value) {
    if (!Number.isFinite(value))
      return;
    this.count++;
    this.sum += value;
    this.updated = Date.now();
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        this.counts.set(bucket.toString(), (this.counts.get(bucket.toString()) ?? 0) + 1);
      }
    }
    this.counts.set("+Inf", (this.counts.get("+Inf") ?? 0) + 1);
  }
  reset() {
    this.count = 0;
    this.sum = 0;
    this.updated = Date.now();
    this.created = Date.now();
    for (const key of this.counts.keys()) {
      this.counts.set(key, 0);
    }
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const labels = this.formatLabels();
    const lines = [this.metadata("gaugehistogram", prefix)];
    for (const bucket of this.buckets) {
      lines.push(`${name}_bucket{le="${bucket}"} ${this.counts.get(bucket.toString()) ?? 0}`);
    }
    lines.push(`${name}_bucket{le="+Inf"} ${this.counts.get("+Inf") ?? 0}`, `${name}_gcount ${this.count}`, `${name}_gsum ${this.sum}`);
    return lines.join(`
`);
  }
  getSnapshot() {
    return {
      buckets: this.buckets,
      counts: this.counts,
      sum: this.sum,
      count: this.count,
      created: new Date(this.created),
      updated: new Date(this.updated)
    };
  }
}
// src/metrics/Info.ts
class Info extends BaseMetric {
  constructor(options) {
    super(options);
    this.validateLabels(options.labels);
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const labels = this.formatLabels();
    return `${this.metadata("info", prefix)}
${name}_info${labels} 1`;
  }
}
// src/metrics/StateSet.ts
class StateSet extends BaseMetric {
  states;
  constructor(options) {
    if (options.unit && options.unit !== "") {
      throw new Error("StateSet metrics must have an empty unit string");
    }
    super({ ...options, unit: "" });
    this.validateStates(options.states);
    this.states = Object.fromEntries(options.states.map((s) => [s, false]));
  }
  validateStates(states) {
    if (states.length === 0) {
      throw new Error("StateSet must have at least one state");
    }
    const seen = new Set;
    for (const state of states) {
      if (seen.has(state)) {
        throw new Error(`Duplicate state name: ${state}`);
      }
      seen.add(state);
      if (state === this.name) {
        throw new Error(`State name cannot match metric name: ${state}`);
      }
    }
  }
  setState(state, value) {
    if (!this.states.hasOwnProperty(state)) {
      throw new Error(`Unknown state: ${state}`);
    }
    this.states[state] = value;
  }
  enableOnly(state) {
    if (!this.states.hasOwnProperty(state)) {
      throw new Error(`Unknown state: ${state}`);
    }
    for (const s of Object.keys(this.states)) {
      this.states[s] = s === state;
    }
  }
  getMetric(prefix) {
    const lines = [this.metadata("stateset", prefix)];
    const metricName = this.getFullName(prefix);
    for (const [state, value] of Object.entries(this.states)) {
      const labels = this.formatLabels({ [this.name]: state });
      lines.push(`${metricName}${labels} ${value ? 1 : 0}`);
    }
    return lines.join(`
`);
  }
}
// src/metrics/Unknown.ts
class Unknown extends BaseMetric {
  value;
  constructor(options) {
    super(options);
    this.value = options.value || 0;
  }
  set(value) {
    this.value = value;
  }
  getMetric(prefix) {
    return `${this.metadata("unknown", prefix)}
${this.getFullName(prefix)} ${this.value}`;
  }
}
export {
  Unknown,
  Summary,
  StateSet,
  Registry,
  Info,
  Histogram,
  GaugeHistogram,
  Gauge,
  Counter
};
