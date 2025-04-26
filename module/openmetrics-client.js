// src/types.ts
var OPENMETRICS_CONTENT_TYPE = "application/openmetrics-text; version=1.0.0; charset=utf-8";

// src/Registry.ts
class Registry {
  metrics = new Map;
  prefix;
  autoRegister;
  static get contentType() {
    return OPENMETRICS_CONTENT_TYPE;
  }
  get contentType() {
    return OPENMETRICS_CONTENT_TYPE;
  }
  constructor(options) {
    this.prefix = options?.prefix;
    this.autoRegister = options?.autoRegister ?? false;
  }
  register(metric) {
    const name = metric.name;
    if (this.metrics.has(name)) {
      throw new Error(`Metric with name ${name} already registered`);
    }
    this.metrics.set(name, metric);
    if (this.autoRegister) {
      metric.registry = this;
    }
  }
  unregister(name) {
    return this.metrics.delete(name);
  }
  getMetrics() {
    return Array.from(this.metrics.values());
  }
  getMetric(name) {
    return this.metrics.get(name);
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
  labelNames;
  registry;
  constructor(options) {
    let name = options.name;
    const unit = options.unit;
    if (unit && !name.endsWith(`_${unit}`)) {
      name = `${name}_${unit}`;
    }
    this.name = name;
    this.help = options.help;
    this.unit = unit;
    this.labelNames = options.labelNames || [];
    this.validateLabelNames();
    if (options.registry) {
      this.registry = options.registry;
      this.registry.register(this);
    }
  }
  validateLabelNames() {
    for (const name of this.labelNames) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid label name: ${name}`);
      }
    }
  }
  validateLabels(labels = {}) {
    const provided = Object.keys(labels);
    for (const label of provided) {
      if (!this.labelNames.includes(label)) {
        throw new Error(`Unexpected label: ${label}`);
      }
    }
    for (const name of this.labelNames) {
      if (!(name in labels)) {
        throw new Error(`Missing label: ${name}`);
      }
    }
  }
  getFullName(prefix) {
    return prefix ? `${prefix}_${this.name}` : this.name;
  }
  formatLabels(labels = {}) {
    const labelStrings = Object.entries(labels).map(([k, v]) => `${k}="${escapeLabelValue(v)}"`);
    return labelStrings.length > 0 ? `{${labelStrings.join(",")}}` : "";
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
  timeSeries = new Map;
  constructor(options) {
    super(options);
    const defaultKey = this.getTimeSeriesKey({});
    this.timeSeries.set(defaultKey, {
      value: 0,
      created: Date.now(),
      updated: Date.now()
    });
  }
  inc(amount = 1, labels) {
    if (amount < 0 || !Number.isFinite(amount)) {
      throw new Error("Counter increment amount must be positive");
    }
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const now = Date.now();
    const entry = this.timeSeries.get(key) || { value: 0, created: now, updated: now };
    entry.value += amount;
    entry.updated = now;
    this.timeSeries.set(key, entry);
  }
  get(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const entry = this.timeSeries.get(key);
    if (!entry) {
      return { value: 0, created: new Date(0), updated: new Date(0) };
    }
    return {
      value: entry.value,
      created: new Date(entry.created),
      updated: new Date(entry.updated)
    };
  }
  reset(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const now = Date.now();
    this.timeSeries.set(key, { value: 0, created: now, updated: now });
  }
  labels(labels = {}) {
    this.validateLabels(labels);
    return {
      inc: (amount = 1) => this.inc(amount, labels)
    };
  }
  getTimeSeriesKey(labels = {}) {
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sorted);
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const lines = [this.metadata("counter", prefix)];
    for (const [key, entry] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      const updatedTimestamp = entry.updated / 1000;
      lines.push(`${name}_total${labelStr} ${entry.value} ${updatedTimestamp}`);
    }
    for (const [key, entry] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      const createdTimestamp = entry.created / 1000;
      const updatedTimestamp = entry.updated / 1000;
      lines.push(`${name}_created${labelStr} ${createdTimestamp} ${updatedTimestamp}`);
    }
    return lines.join(`
`);
  }
}
// src/metrics/Gauge.ts
class Gauge extends BaseMetric {
  timeSeries = new Map;
  constructor(options) {
    super(options);
  }
  inc(amount = 1, labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const entry = this.timeSeries.get(key) || { value: 0, updated: 0 };
    entry.value += amount;
    entry.updated = Date.now();
    this.timeSeries.set(key, entry);
  }
  dec(amount = 1, labels) {
    this.inc(-amount, labels);
  }
  set(value, labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    this.timeSeries.set(key, { value, updated: Date.now() });
  }
  get(labels) {
    const key = this.getTimeSeriesKey(labels);
    const data = this.timeSeries.get(key);
    if (!data)
      return null;
    return {
      value: data.value,
      updated: new Date(data.updated)
    };
  }
  getTimeSeriesKey(labels = {}) {
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sorted);
  }
  labels(labels = {}) {
    this.validateLabels(labels);
    return {
      inc: (amount = 1) => this.inc(amount, labels),
      dec: (amount = 1) => this.dec(amount, labels),
      set: (value) => this.set(value, labels)
    };
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const lines = [this.metadata("gauge", prefix)];
    for (const [key, entry] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      const timestamp = entry.updated / 1000;
      lines.push(`${name}${labelStr} ${entry.value} ${timestamp}`);
    }
    return lines.join(`
`);
  }
}
// src/metrics/Histogram.ts
class Histogram extends BaseMetric {
  buckets;
  timeSeries = new Map;
  constructor(options) {
    super(options);
    const defaultBuckets = [0.1, 0.5, 1, 5, 10];
    this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);
    if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
      throw new Error("Histogram buckets must be positive numbers");
    }
  }
  initializeTimeSeries() {
    const counts = new Map;
    this.buckets.forEach((b) => counts.set(b.toString(), 0));
    counts.set("+Inf", 0);
    return {
      counts,
      sum: 0,
      count: 0,
      created: Date.now(),
      updated: Date.now()
    };
  }
  observe(value, labels) {
    if (value < 0 || !Number.isFinite(value)) {
      throw new Error("Histogram observation value must be non-negative and finite");
    }
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const now = Date.now();
    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, this.initializeTimeSeries());
    }
    const series = this.timeSeries.get(key);
    series.count++;
    series.sum += value;
    series.updated = now;
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        const bucketKey = bucket.toString();
        series.counts.set(bucketKey, (series.counts.get(bucketKey) || 0) + 1);
      }
    }
    series.counts.set("+Inf", (series.counts.get("+Inf") || 0) + 1);
  }
  labels(labels = {}) {
    this.validateLabels(labels);
    return {
      observe: (value) => this.observe(value, labels)
    };
  }
  reset(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    this.timeSeries.set(key, this.initializeTimeSeries());
  }
  getSnapshot(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const series = this.timeSeries.get(key);
    if (!series) {
      const emptyCounts = new Map;
      this.buckets.forEach((b) => emptyCounts.set(b.toString(), 0));
      emptyCounts.set("+Inf", 0);
      return {
        buckets: this.buckets,
        counts: emptyCounts,
        sum: 0,
        count: 0,
        created: new Date(0),
        updated: new Date(0)
      };
    }
    return {
      buckets: this.buckets,
      counts: new Map(series.counts),
      sum: series.sum,
      count: series.count,
      created: new Date(series.created),
      updated: new Date(series.updated)
    };
  }
  getTimeSeriesKey(labels = {}) {
    const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const lines = [this.metadata("histogram", prefix)];
    for (const [key, series] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      const createdTimestamp = series.created / 1000;
      this.buckets.forEach((bucket) => {
        lines.push(`${name}_bucket{le="${bucket}"${labelStr ? "," + labelStr.slice(1) : "}"} ${series.counts.get(bucket.toString()) || 0}`);
      });
      lines.push(`${name}_bucket{le="+Inf"${labelStr ? "," + labelStr.slice(1) : "}"} ${series.counts.get("+Inf") || 0}`, `${name}_count${labelStr} ${series.count}`, `${name}_sum${labelStr} ${series.sum}`, `${name}_created${labelStr} ${createdTimestamp}`);
    }
    return lines.join(`
`);
  }
}
// src/metrics/Summary.ts
class Summary extends BaseMetric {
  quantiles;
  maxAgeSeconds;
  ageBuckets;
  timeSeries = new Map;
  constructor(options) {
    super(options);
    this.quantiles = options.quantiles || [0.5, 0.9, 0.99];
    this.maxAgeSeconds = options.maxAgeSeconds || 600;
    this.ageBuckets = options.ageBuckets || 5;
    this.validateQuantiles();
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
  initializeTimeSeries(key) {
    const rotationInterval = setInterval(() => this.rotateBuckets(key), this.maxAgeSeconds * 1000 / this.ageBuckets);
    rotationInterval.unref?.();
    return {
      buckets: [],
      currentBucket: this.createBucket(),
      sum: 0,
      count: 0,
      created: Date.now(),
      updated: Date.now(),
      rotationInterval
    };
  }
  rotateBuckets(key) {
    const series = this.timeSeries.get(key);
    if (!series)
      return;
    series.buckets.push(series.currentBucket);
    const cutoff = Date.now() - this.maxAgeSeconds * 1000;
    series.buckets = series.buckets.filter((b) => b.timestamp >= cutoff);
    this.recalculateAggregates(series);
    series.currentBucket = this.createBucket();
    series.updated = Date.now();
  }
  recalculateAggregates(series) {
    series.sum = series.buckets.reduce((sum, b) => sum + b.sum, 0);
    series.count = series.buckets.reduce((count, b) => count + b.count, 0);
  }
  observe(value, labels) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Summary observation value must be finite and non-negative");
    }
    const safeLabels = labels || {};
    this.validateLabels(safeLabels);
    const key = this.getTimeSeriesKey(safeLabels);
    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, this.initializeTimeSeries(key));
    }
    const series = this.timeSeries.get(key);
    series.currentBucket.values.push(value);
    series.currentBucket.sum += value;
    series.currentBucket.count++;
    series.sum += value;
    series.count++;
    series.updated = Date.now();
  }
  labels(labels = {}) {
    this.validateLabels(labels);
    return {
      observe: (value) => this.observe(value, labels)
    };
  }
  reset(labels) {
    const safeLabels = labels || {};
    this.validateLabels(safeLabels);
    const key = this.getTimeSeriesKey(safeLabels);
    if (this.timeSeries.has(key)) {
      const series = this.timeSeries.get(key);
      clearInterval(series.rotationInterval);
      this.timeSeries.set(key, this.initializeTimeSeries(key));
    }
  }
  getSnapshot(labels) {
    const safeLabels = labels || {};
    this.validateLabels(safeLabels);
    const key = this.getTimeSeriesKey(safeLabels);
    const series = this.timeSeries.get(key);
    if (!series) {
      return {
        sum: 0,
        count: 0,
        buckets: 0,
        currentBucketSize: 0,
        maxAgeSeconds: this.maxAgeSeconds,
        updated: new Date(0),
        created: new Date(0)
      };
    }
    return {
      sum: series.sum,
      count: series.count,
      buckets: series.buckets.length,
      currentBucketSize: series.currentBucket.values.length,
      maxAgeSeconds: this.maxAgeSeconds,
      updated: new Date(series.updated),
      created: new Date(series.created)
    };
  }
  getTimeSeriesKey(labels) {
    const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }
  getMetric(prefix) {
    const fullName = this.getFullName(prefix);
    const lines = [this.metadata("summary", prefix)];
    for (const [key, series] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      const createdTimestamp = series.created / 1000;
      const allValues = series.buckets.concat([series.currentBucket]).flatMap((b) => b.values);
      if (allValues.length > 0) {
        const sortedValues = [...allValues].sort((a, b) => a - b);
        for (const q of this.quantiles) {
          const pos = q * (sortedValues.length - 1);
          const base = Math.floor(pos);
          const rest = pos - base;
          const baseValue = sortedValues[base];
          const nextValue = sortedValues[base + 1];
          let value = NaN;
          if (baseValue !== undefined) {
            value = nextValue !== undefined ? baseValue + rest * (nextValue - baseValue) : baseValue;
          }
          lines.push(`${fullName}{quantile="${q}"${labelStr ? "," + labelStr.slice(1) : "}"} ${value}`);
        }
      } else {
        for (const q of this.quantiles) {
          lines.push(`${fullName}{quantile="${q}"${labelStr ? "," + labelStr.slice(1) : "}"} NaN`);
        }
      }
      lines.push(`${fullName}_sum${labelStr} ${series.sum}`, `${fullName}_count${labelStr} ${series.count}`, `${fullName}_created${labelStr} ${createdTimestamp}`);
    }
    return lines.join(`
`);
  }
  destroy() {
    for (const series of this.timeSeries.values()) {
      clearInterval(series.rotationInterval);
    }
    this.timeSeries.clear();
  }
}
// src/metrics/GaugeHistogram.ts
class GaugeHistogram extends BaseMetric {
  buckets;
  timeSeries = new Map;
  constructor(options) {
    super(options);
    const defaultBuckets = [0.1, 0.5, 1, 5, 10];
    this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);
    if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
      throw new Error("GaugeHistogram buckets must be positive numbers");
    }
  }
  initializeTimeSeries() {
    const counts = new Map;
    this.buckets.forEach((b) => counts.set(b.toString(), 0));
    counts.set("+Inf", 0);
    return {
      counts,
      sum: 0,
      count: 0,
      created: Date.now(),
      updated: Date.now()
    };
  }
  observe(value, labels) {
    if (!Number.isFinite(value)) {
      throw new Error("GaugeHistogram observation value must be finite");
    }
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const now = Date.now();
    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, this.initializeTimeSeries());
    }
    const series = this.timeSeries.get(key);
    series.count++;
    series.sum += value;
    series.updated = now;
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        const bucketKey = bucket.toString();
        series.counts.set(bucketKey, (series.counts.get(bucketKey) || 0) + 1);
      }
    }
    series.counts.set("+Inf", (series.counts.get("+Inf") || 0) + 1);
  }
  labels(labels = {}) {
    this.validateLabels(labels);
    return {
      observe: (value) => this.observe(value, labels)
    };
  }
  reset(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    this.timeSeries.set(key, this.initializeTimeSeries());
  }
  getSnapshot(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    const series = this.timeSeries.get(key);
    if (!series) {
      const emptyCounts = new Map;
      this.buckets.forEach((b) => emptyCounts.set(b.toString(), 0));
      emptyCounts.set("+Inf", 0);
      return {
        buckets: this.buckets,
        counts: emptyCounts,
        sum: 0,
        count: 0,
        created: new Date(0),
        updated: new Date(0)
      };
    }
    return {
      buckets: this.buckets,
      counts: new Map(series.counts),
      sum: series.sum,
      count: series.count,
      created: new Date(series.created),
      updated: new Date(series.updated)
    };
  }
  getTimeSeriesKey(labels = {}) {
    const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const lines = [this.metadata("gaugehistogram", prefix)];
    for (const [key, series] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      this.buckets.forEach((bucket) => {
        lines.push(`${name}_bucket{le="${bucket}"${labelStr ? "," + labelStr.slice(1) : "}"} ${series.counts.get(bucket.toString()) || 0}`);
      });
      lines.push(`${name}_bucket{le="+Inf"${labelStr ? "," + labelStr.slice(1) : "}"} ${series.counts.get("+Inf") || 0}`);
      lines.push(`${name}_gsum${labelStr} ${series.sum}`, `${name}_gcount${labelStr} ${series.count}`);
    }
    return lines.join(`
`);
  }
}
// src/metrics/Info.ts
class Info extends BaseMetric {
  timeSeries = new Set;
  constructor(options) {
    super(options);
  }
  set(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    this.timeSeries.add(key);
  }
  labels(labels = {}) {
    this.validateLabels(labels);
    return {
      set: () => this.set(labels)
    };
  }
  getTimeSeriesKey(labels = {}) {
    const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const lines = [this.metadata("info", prefix)];
    for (const key of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      lines.push(`${name}_info${labelStr} 1`);
    }
    return lines.join(`
`);
  }
}
// src/metrics/StateSet.ts
class StateSet extends BaseMetric {
  stateNames;
  timeSeries = new Map;
  constructor(options) {
    if (options.unit && options.unit !== "") {
      throw new Error("StateSet metrics must have an empty unit string");
    }
    super({ ...options, unit: "" });
    this.validateStates(options.states);
    this.stateNames = options.states;
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
  initializeStateSet() {
    return {
      states: Object.fromEntries(this.stateNames.map((s) => [s, false]))
    };
  }
  setState(state, value, labels) {
    this.validateLabels(labels);
    if (!this.stateNames.includes(state)) {
      throw new Error(`Unknown state: ${state}`);
    }
    const key = this.getTimeSeriesKey(labels);
    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, this.initializeStateSet());
    }
    this.timeSeries.get(key).states[state] = value;
  }
  getState(state, labels) {
    this.validateLabels(labels);
    if (!this.stateNames.includes(state)) {
      throw new Error(`Unknown state: ${state}`);
    }
    const key = this.getTimeSeriesKey(labels);
    return this.timeSeries.get(key)?.states[state] || false;
  }
  enableOnly(state, labels) {
    this.validateLabels(labels);
    if (!this.stateNames.includes(state)) {
      throw new Error(`Unknown state: ${state}`);
    }
    const key = this.getTimeSeriesKey(labels);
    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, this.initializeStateSet());
    }
    const series = this.timeSeries.get(key);
    for (const s of this.stateNames) {
      series.states[s] = s === state;
    }
  }
  labels(labels) {
    this.validateLabels(labels);
    return {
      setState: (state, value) => this.setState(state, value, labels),
      enableOnly: (state) => this.enableOnly(state, labels),
      getState: (state) => this.getState(state, labels)
    };
  }
  getTimeSeriesKey(labels = {}) {
    const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }
  getMetric(prefix) {
    const lines = [this.metadata("stateset", prefix)];
    const metricName = this.getFullName(prefix);
    for (const [key, series] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const baseLabelStr = this.formatLabels(labels);
      for (const [state, value] of Object.entries(series.states)) {
        const stateLabel = { [this.name]: state };
        const fullLabelStr = this.formatLabels({ ...labels, ...stateLabel });
        lines.push(`${metricName}${fullLabelStr} ${value ? 1 : 0}`);
      }
    }
    return lines.join(`
`);
  }
}
// src/metrics/Unknown.ts
class Unknown extends BaseMetric {
  timeSeries = new Map;
  constructor(options) {
    super(options);
    if (options.value !== undefined) {
      const defaultKey = this.getTimeSeriesKey({});
      this.timeSeries.set(defaultKey, {
        value: options.value,
        updated: Date.now()
      });
    }
  }
  set(value, labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    this.timeSeries.set(key, {
      value,
      updated: Date.now()
    });
  }
  labels(labels = {}) {
    this.validateLabels(labels);
    return {
      set: (value) => this.set(value, labels)
    };
  }
  get(labels) {
    this.validateLabels(labels);
    const key = this.getTimeSeriesKey(labels);
    return this.timeSeries.get(key)?.value;
  }
  getTimeSeriesKey(labels = {}) {
    const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }
  getMetric(prefix) {
    const name = this.getFullName(prefix);
    const lines = [this.metadata("unknown", prefix)];
    for (const [key, series] of this.timeSeries) {
      const labels = Object.fromEntries(JSON.parse(key));
      const labelStr = this.formatLabels(labels);
      lines.push(`${name}${labelStr} ${series.value}`);
    }
    return lines.join(`
`);
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
