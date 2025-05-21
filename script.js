//Define size of dashboard
const size = { width: 600, height: 300, margin: { top: 40, right: 40, bottom: 60, left: 60 } };
const inner = { width: size.width - size.margin.left - size.margin.right, height: size.height - size.margin.top - size.margin.bottom };

//Create rows in dashboard
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

//Import and clean data (important important fields)
Promise.all([
  d3.csv("student_habits_performance.csv", d => {
    d.study_hours_per_day = +d.study_hours_per_day;
    d.sleep_hours = +d.sleep_hours;
    d.age = +d.age;
    d.attendance_percentage = +d.attendance_percentage;
    d.social_media_hours = +d.social_media_hours;
    d.netflix_hours = +d.netflix_hours;
    d.exercise_frequency = +d.exercise_frequency;
    return d;
  })
]).then(([data]) => {

  //SCATTERPLOT

  //Trend line function
  function getTrendLine(data) {
    const n = data.length;
    const sumX = d3.sum(data, d => d.study_hours_per_day);
    const sumY = d3.sum(data, d => d.sleep_hours);
    const sumXY = d3.sum(data, d => d.study_hours_per_day * d.sleep_hours);
    const sumX2 = d3.sum(data, d => d.study_hours_per_day * d.study_hours_per_day);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const xExtent = d3.extent(data, d => d.study_hours_per_day);
    return [
      { x: xExtent[0], y: slope * xExtent[0] + intercept },
      { x: xExtent[1], y: slope * xExtent[1] + intercept }
    ];
  }

  //Define Scatterplot
  const scatterSvg = d3.select("#scatter")
    .append("g").attr("transform", `translate(${size.margin.left},${size.margin.top})`);

  //X and Y axis scales
  const x1 = d3.scaleLinear().domain(d3.extent(data, d => d.study_hours_per_day)).nice().range([0, inner.width]);
  const y1 = d3.scaleLinear().domain(d3.extent(data, d => d.sleep_hours)).nice().range([inner.height, 0]);

  scatterSvg.append("g").attr("transform", `translate(0,${inner.height})`).call(d3.axisBottom(x1));
  scatterSvg.append("g").call(d3.axisLeft(y1));

  //Axis labels
  scatterSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", inner.width / 2)
    .attr("y", inner.height + 40)
    .attr("text-anchor", "middle")
    .text("Study Hours per Day");

  scatterSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -inner.height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Sleep Hours");

  //draw scatterplot function
  const drawScatter = (filteredData) => {
    scatterSvg.selectAll("circle").remove();
    scatterSvg.selectAll(".trendline").remove();

    //Plot points
    scatterSvg.selectAll("circle")
      .data(filteredData, d => d.student_id)
      .enter().append("circle")
      .attr("cx", d => x1(d.study_hours_per_day))
      .attr("cy", d => y1(d.sleep_hours))
      .attr("r", 5)
      .attr("fill", "steelblue")
      .on("mouseover", (event, d) => {  //hover tooltip
        tooltip.style("visibility", "visible").html(`Sleep: ${d.sleep_hours} hrs<br>Study: ${d.study_hours_per_day} hrs`);
      })
      .on("mousemove", event => {
        tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    //Draw trend line
    const linePoints = getTrendLine(filteredData);
    scatterSvg.append("line")
      .attr("class", "trendline")
      .attr("x1", x1(linePoints[0].x))
      .attr("y1", y1(linePoints[0].y))
      .attr("x2", x1(linePoints[1].x))
      .attr("y2", y1(linePoints[1].y))
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");
  };

  //Real-time changing
  drawScatter(data);
  d3.select("#genderFilter").on("change", function () {
    const selected = this.value;
    const filtered = selected === "All" ? data : data.filter(d => d.gender === selected);
    drawScatter(filtered);
  });

  //LINE GRAPH
  //initial line graph step
  const sleepSvg = d3.select("#line")
    .append("g").attr("transform", `translate(${size.margin.left},${size.margin.top})`);

    //find averages for each age group
  const avgSleep = d3.rollups(data, v => d3.mean(v, d => d.sleep_hours), d => d.age).sort((a, b) => a[0] - b[0]);
  let x = d3.scaleLinear().domain(d3.extent(avgSleep, d => d[0])).range([0, inner.width]);
  const y = d3.scaleLinear().domain([0, d3.max(avgSleep, d => d[1])]).range([inner.height, 0]);

  //X and Y axis
  const xAxis = sleepSvg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${inner.height})`).call(d3.axisBottom(x));
  const yAxis = sleepSvg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

  const line = d3.line().x(d => x(d[0])).y(d => y(d[1]));
  let path = sleepSvg.append("path")
    .datum(avgSleep)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "darkgreen")
    .attr("stroke-width", 2)
    .attr("d", line);

  let points = sleepSvg.selectAll("circle")
    .data(avgSleep)
    .enter().append("circle")
    .attr("cx", d => x(d[0]))
    .attr("cy", d => y(d[1]))
    .attr("r", 4)
    .attr("fill", "darkgreen")
    .on("mouseover", (event, d) => tooltip.style("visibility", "visible").html(`Age: ${d[0]}<br>Avg Sleep: ${d[1].toFixed(1)} hrs`))
    .on("mousemove", event => tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px"))
    .on("mouseout", () => tooltip.style("visibility", "hidden"));

    //Brushing and Zooming effect
  const brush = d3.brushX()
    .extent([[0, 0], [inner.width, inner.height]])
    .on("end", function ({ selection }) {
      if (!selection) return;
      const [x0, x1] = selection;
      const newDomain = [x.invert(x0), x.invert(x1)];
      x.domain(newDomain);

      xAxis.transition().duration(1000).call(d3.axisBottom(x));
      path.transition().duration(1000).attr("d", line);
      points.transition().duration(1000)
        .attr("cx", d => x(d[0]))
        .attr("cy", d => y(d[1]));

      sleepSvg.select(".brush").call(brush.move, null);
    });

  sleepSvg.append("g")
    .attr("class", "brush")
    .call(brush);

  sleepSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", inner.width / 2)
    .attr("y", inner.height + 40)
    .attr("text-anchor", "middle")
    .text("Age");

  sleepSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -inner.height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Avg Sleep Hours");

  //Add zoom out button
  sleepSvg.append("foreignObject")
    .attr("x", inner.width - 100)
    .attr("y", -30)
    .attr("width", 100)
    .attr("height", 30)
    .append("xhtml:button")
    .style("font-size", "12px")
    .style("padding", "2px 6px")
    .text("Reset Zoom")
    .on("click", () => {
      x.domain(d3.extent(avgSleep, d => d[0]));
      xAxis.transition().duration(750).call(d3.axisBottom(x));
      path.transition().duration(750).attr("d", line);
      points.transition().duration(750)
        .attr("cx", d => x(d[0]))
        .attr("cy", d => y(d[1]));
    });

 //BOX PLOT
 const boxSvg = d3.select("#box").append("g").attr("transform", `translate(${size.margin.left},${size.margin.top})`);
const categories = ["Yes", "No"];
const x3 = d3.scaleBand().domain(categories).range([0, inner.width]).padding(0.3);
let y3 = d3.scaleLinear().domain([0, 100]).range([inner.height, 0]); // Initial full domain
let activeBox = null;

// Add Y axis
const yAxisBox = boxSvg.append("g").attr("class", "y-axis").call(d3.axisLeft(y3));
boxSvg.append("g").attr("transform", `translate(0,${inner.height})`).call(d3.axisBottom(x3));

// Axis labels
boxSvg.append("text").attr("class", "axis-label")
  .attr("x", inner.width / 2).attr("y", inner.height + 40)
  .attr("text-anchor", "middle").text("Part-Time Job");

boxSvg.append("text").attr("class", "axis-label")
  .attr("transform", "rotate(-90)")
  .attr("x", -inner.height / 2).attr("y", -45)
  .attr("text-anchor", "middle").text("Attendance %");

// Preprocess all stats by category
const boxStats = {};
categories.forEach(cat => {
  const vals = data.filter(d => d.part_time_job === cat).map(d => d.attendance_percentage).sort(d3.ascending);
  const q1 = d3.quantile(vals, 0.25), median = d3.quantile(vals, 0.5), q3 = d3.quantile(vals, 0.75);
  const min = d3.min(vals), max = d3.max(vals), iqr = q3 - q1;
  const outliers = vals.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
  boxStats[cat] = { vals, q1, q3, median, min, max, iqr, outliers };
});

// Draw initial boxplot elements
categories.forEach(cat => {
  const { q1, q3, median, min, max, outliers } = boxStats[cat];
  const center = x3(cat) + x3.bandwidth() / 2;

  // Whisker
  boxSvg.append("line").attr("class", `whisker-${cat}`)
    .attr("x1", center).attr("x2", center)
    .attr("y1", y3(min)).attr("y2", y3(max))
    .attr("stroke", "black");

  // Box
  boxSvg.append("rect")
    .attr("class", `box-${cat}`)
    .attr("x", x3(cat)).attr("y", y3(q3))
    .attr("width", x3.bandwidth())
    .attr("height", y3(q1) - y3(q3))
    .attr("fill", "#69b3a2")
    .on("click", () => {
      const isZoomed = activeBox === cat;
      activeBox = isZoomed ? null : cat;

      const newDomain = isZoomed
        ? [0, 100]
        : [Math.max(0, min - 5), Math.min(100, max + 5)];

      y3.domain(newDomain);

      // Animate axis
      yAxisBox.transition().duration(750).call(d3.axisLeft(y3));

      // Animate box
      categories.forEach(c => {
        const stat = boxStats[c];
        const center = x3(c) + x3.bandwidth() / 2;

        boxSvg.select(`.box-${c}`)
          .transition().duration(750)
          .attr("y", y3(stat.q3))
          .attr("height", y3(stat.q1) - y3(stat.q3))
          .attr("fill", activeBox === null || activeBox === c ? "#69b3a2" : "#ccc");

        boxSvg.select(`.median-${c}`)
          .transition().duration(750)
          .attr("y1", y3(stat.median)).attr("y2", y3(stat.median));

        boxSvg.select(`.whisker-${c}`)
          .transition().duration(750)
          .attr("y1", y3(stat.min)).attr("y2", y3(stat.max));

        boxSvg.selectAll(`.outlier-${c}`)
          .transition().duration(750)
          .attr("cy", d => y3(d));
      });
    });

  // Median line
  boxSvg.append("line")
    .attr("class", `median-${cat}`)
    .attr("x1", x3(cat)).attr("x2", x3(cat) + x3.bandwidth())
    .attr("y1", y3(median)).attr("y2", y3(median))
    .attr("stroke", "black");

  // Outliers
  boxSvg.selectAll(`.outlier-${cat}`)
    .data(outliers).enter()
    .append("circle")
    .attr("class", `outlier-${cat}`)
    .attr("cx", center).attr("cy", d => y3(d)).attr("r", 3).attr("fill", "red")
    .on("mouseover", (event, d) => tooltip.style("visibility", "visible").html(`Outlier: ${d}% attendance`))
    .on("mousemove", event => tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px"))
    .on("mouseout", () => tooltip.style("visibility", "hidden"));
});


  //BAR CHART
  const stackSvg = d3.select("#bar").append("g").attr("transform", `translate(${size.margin.left},${size.margin.top})`);
  const keys = ["study_hours_per_day", "social_media_hours", "netflix_hours", "exercise_frequency"];
  let activeKey = null;


//Divide by gender for x -axis
const stackData = d3.groups(data, d => d.gender).map(([gender, group]) => {
  const out = { gender };
  keys.forEach(k => {
    const values = group.map(d => d[k]).filter(v => !isNaN(v));
    out[k] = d3.mean(values); //CHANGED TO MEAN TO HELP ANALYZE TRENDS BETWEEN GENDERS BETTER!
  });
  return out;
});


  const x4 = d3.scaleBand().domain(stackData.map(d => d.gender)).range([0, inner.width]).padding(0.2);
  const y4 = d3.scaleLinear().domain([0, d3.max(stackData, d => keys.reduce((a, k) => a + d[k], 0))]).nice().range([inner.height, 0]);
  const color = d3.scaleOrdinal().domain(keys).range(d3.schemeSet2);

  stackSvg.append("g").attr("transform", `translate(0,${inner.height})`).call(d3.axisBottom(x4));
  stackSvg.append("g").call(d3.axisLeft(y4));

  stackSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", inner.width / 2)
    .attr("y", inner.height + 40)
    .attr("text-anchor", "middle")
    .text("Gender");

  stackSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -inner.height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Total Hours");

//make it a stacked bar chart for more insight
  const renderStacked = (filterKey = null) => {
    stackSvg.selectAll(".serie").remove();
    const filteredKeys = filterKey ? [filterKey] : keys;
    const stackedSeries = d3.stack().keys(filteredKeys)(stackData);

    const groups = stackSvg.selectAll(".serie")
      .data(stackedSeries).enter()
      .append("g")
      .attr("fill", d => color(d.key))
      .attr("class", "serie")
      .on("click", (event, d) => {
        activeKey = activeKey === d.key ? null : d.key;
        renderStacked(activeKey);
      });

    groups.selectAll("rect")
      .data(d => d).enter()
      .append("rect")
      .attr("x", d => x4(d.data.gender))
      .attr("y", d => y4(d[1]))
      .attr("height", d => y4(d[0]) - y4(d[1]))
      .attr("width", x4.bandwidth())
      .on("mouseover", function (event, d) {
        const key = d3.select(this.parentNode).datum().key;
        tooltip.style("visibility", "visible").html(`${key} Hours: ${(d.data[key]).toFixed(1)}`);
      })
      .on("mousemove", event => tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px"))
      .on("mouseout", () => tooltip.style("visibility", "hidden")); //Isolations
  };

  renderStacked();
  stackSvg.append("g").attr("transform", `translate(0,${inner.height})`).call(d3.axisBottom(x4));

  //Legend
  const legend = stackSvg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0, ${inner.height + 50})`);

  keys.forEach((key, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(${i * 110}, 0)`);  // spread horizontally

    legendRow.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(key));

    legendRow.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("font-size", "9px")
      .attr("fill", "black")
      .text(key.replace(/_/g, " "));
  });


});
