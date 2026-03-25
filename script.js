// Define chart margins and drawing area dimensions.
const margin = { top: 24, right: 28, bottom: 56, left: 66 };
const width = 980;
const height = 520;

// Create the root SVG and provide accessible chart text for screen readers.
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("role", "img")
  .attr(
    "aria-label",
    "Line chart of percent of NYC residents with health insurance by year.",
  );

const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

// Shift the plotting group so axes/marks respect margins.
const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Reuse an existing tooltip if present, otherwise create one.
const tooltip =
  d3.select("body").select(".tooltip").node() ||
  d3.select("body").append("div").attr("class", "tooltip").node();

const tip = d3.select(tooltip);

// Parse numeric years into dates for a time scale and format them for labels.
const parseYear = d3.timeParse("%Y");
const formatYear = d3.timeFormat("%Y");

const createScales = (data) => {
  const xBase = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date))
    .range([0, plotWidth]);

  const yMax = d3.max(data, (d) => d.insuredPct);
  const yBase = d3
    .scaleLinear()
    .domain([0, Math.ceil(yMax + 1)])
    .nice()
    .range([plotHeight, 0]);

  return { x: xBase.copy(), y: yBase.copy() };
};

const drawAxesAndGrid = (x, y) => {
  const grid = g
    .append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-plotWidth).tickFormat(""));

  const xAxisG = g
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%Y")));

  const yAxis = g
    .append("g")
    .attr("class", "axis")
    .call(
      d3
        .axisLeft(y)
        .ticks(6)
        .tickFormat((d) => `${d}%`),
    );

  return { grid, xAxisG, yAxis };
};

const styleXAxisTickLabels = (xAxisG) => {
  xAxisG
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .attr("dx", "-0.6em")
    .attr("dy", "0.3em");
};

const drawAxisTitles = () => {
  g.append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + 48)
    .attr("fill", "#3f5066")
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("text")
    .attr("x", -plotHeight / 2)
    .attr("y", -48)
    .attr("fill", "#3f5066")
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Residents with health insurance (%)");
};

const createLineGenerator = (x, y) => {
  return d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.insuredPct));
};

const drawLine = (data, line) => {
  return g
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "var(--line)")
    .attr("stroke-width", 3)
    .attr("d", line);
};

const drawPoints = (data, x, y) => {
  return g
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.insuredPct))
    .attr("r", 4.5)
    .attr("fill", "var(--point)")
    .on("mousemove", (event, d) => {
      tip
        .style("opacity", 1)
        .style("left", `${event.pageX}px`)
        .style("top", `${event.pageY}px`)
        .html(
          `<strong>${formatYear(d.date)}</strong><br>${d.insuredPct.toFixed(1)}% insured`,
        );
    })
    .on("mouseleave", () => tip.style("opacity", 0));
};

const computeAnimationConfig = (data) => {
  const msPerYear = 365 * 24 * 60 * 60 * 1000;
  const xWindowMs = 2 * msPerYear;
  const firstDate = data[0].date;
  const lastDate = data[data.length - 1].date;
  const xTravelMs = Math.max(0, lastDate - firstDate - xWindowMs);

  const yDataMin = d3.min(data, (d) => d.insuredPct);
  const yDataMax = d3.max(data, (d) => d.insuredPct);
  const yFullMin = 0;
  const yFullMax = Math.ceil(yDataMax + 1);
  const yWindowMin = Math.floor(yDataMin);
  const yWindowMax = yWindowMin + 15;

  const fullDuration = 12000;

  return {
    firstDate,
    lastDate,
    xTravelMs,
    xWindowMs,
    yFullMin,
    yFullMax,
    yWindowMin,
    yWindowMax,
    fullDuration,
  };
};

const redrawChart = ({ grid, xAxisG, yAxis, x, y, linePath, line, points }) => {
  grid.call(d3.axisLeft(y).ticks(6).tickSize(-plotWidth).tickFormat(""));
  xAxisG.call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%Y")));
  styleXAxisTickLabels(xAxisG);

  yAxis.call(
    d3
      .axisLeft(y)
      .ticks(6)
      .tickFormat((d) => `${d}%`),
  );

  linePath.attr("d", line);
  points.attr("cx", (d) => x(d.date)).attr("cy", (d) => y(d.insuredPct));
};

const animateViewport = ({ x, y, redraw, config }) => {
  const {
    firstDate,
    lastDate,
    xTravelMs,
    xWindowMs,
    yFullMin,
    yFullMax,
    yWindowMin,
    yWindowMax,
    fullDuration,
  } = config;

  svg
    .transition()
    .duration(fullDuration)
    .ease(d3.easeLinear)
    .tween("progressive-zoom", () => {
      return (t) => {
        const zoomT = d3.easeCubicInOut(t);
        const xStart = new Date(firstDate.getTime() + xTravelMs * t);
        const xEnd = new Date(xStart.getTime() + xWindowMs);
        const xDomainStart = new Date(
          firstDate.getTime() +
            (xStart.getTime() - firstDate.getTime()) * zoomT,
        );
        const xDomainEnd = new Date(
          lastDate.getTime() + (xEnd.getTime() - lastDate.getTime()) * zoomT,
        );
        x.domain([xDomainStart, xDomainEnd]);

        const yMinNow = yFullMin + (yWindowMin - yFullMin) * zoomT;
        const yMaxNow = yFullMax + (yWindowMax - yFullMax) * zoomT;
        y.domain([yMinNow, yMaxNow]);

        redraw();
      };
    });
};

const makeChart = (data) => {
  const { x, y } = createScales(data);
  const { grid, xAxisG, yAxis } = drawAxesAndGrid(x, y);
  styleXAxisTickLabels(xAxisG);
  drawAxisTitles();

  const line = createLineGenerator(x, y);
  const linePath = drawLine(data, line);
  const points = drawPoints(data, x, y);
  const config = computeAnimationConfig(data);

  animateViewport({
    x,
    y,
    config,
    redraw: () =>
      redrawChart({ grid, xAxisG, yAxis, x, y, linePath, line, points }),
  });
};

const transformRowToDatum = (row) => {
  const uninsuredPct = Number(row["No Health Insurance"]);
  return {
    year: Number(row.Year),
    date: parseYear(row.Year),
    insuredPct: 100 - uninsuredPct,
  };
};

const isValidDatum = (datum) => {
  return (
    Number.isFinite(datum.year) &&
    datum.date &&
    Number.isFinite(datum.insuredPct)
  );
};

const parseSurveyData = (rows) => {
  return rows
    .filter(
      (row) =>
        /^Prevalence/i.test(row.Prevelance) &&
        row["No Health Insurance"] !== "",
    )
    .map(transformRowToDatum)
    .filter(isValidDatum)
    .sort((a, b) => a.year - b.year);
};

// Load local CSV data and build the chart.
d3.csv("New_York_City_Community_Health_Survey_20260325.csv").then((rows) => {
  const data = parseSurveyData(rows);

  makeChart(data);
});
