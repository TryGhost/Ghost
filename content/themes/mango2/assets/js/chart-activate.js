// chart activated
$(document).ready(function(){
    var DATA_COUNT = 6;

    var utils = Samples.utils;

    utils.srand(110);

    function alternatePointStyles(ctx) {
        var index = ctx.dataIndex;
        return index % 2 === 0 ? 'circle' : 'rect';
    }

    function makeHalfAsOpaque(ctx) {
        var c = ctx.dataset.backgroundColor;
        return utils.transparentize(c);
    }

    function adjustRadiusBasedOnData(ctx) {
        var v = ctx.dataset.data[ctx.dataIndex];
        return v < 10 ? 5
            : v < 25 ? 7
            : v < 50 ? 9
            : v < 75 ? 11
            : 6;
    }

    function generateData() {
        return utils.numbers({
            count: DATA_COUNT,
            min: 0,
            max: 60
        });
    }

    var data = {
        labels: utils.months({count: DATA_COUNT}),
        datasets: [{
            data: generateData(),
            backgroundColor: '#ef8902',
            borderColor: '#ef8902'
        }, {
            data: generateData(),
            backgroundColor: '#4dc9f6',
            borderColor: '#4dc9f6'
        }, {
            data: generateData(),
            type: 'scatter', 
            showLine: true, // overrides the `line` dataset default
            backgroundColor: '#972bf0',
            borderColor: '#972bf0'
        }]
    };

    var options = {
        legend: false,
        tooltips: true,
        elements: {
            line: {
                fill: false,
            },
            point: {
                hoverBackgroundColor: makeHalfAsOpaque,
                radius: adjustRadiusBasedOnData,
                pointStyle: alternatePointStyles,
                hoverRadius: 15,
            }
        },
        maintainAspectRatio: false,
        aspectRatio: 2,
        scales: {
          yAxes: [{
            // stacked: true,
            gridLines: {
              display: true,
              color: "rgba(255,225,225,0.2)"
            }
          }],
          xAxes: [{
            gridLines: {
                display: true,
                color: "rgba(255,225,225,0.2)"
            }
          }]
        }
    };

    var chart = new Chart('chart-0', {
        type: 'line',
        data: data,
        options: options,
    });


    // eslint-disable-next-line no-unused-vars
    function addDataset() {
        var newColor = utils.color(chart.data.datasets.length);

        chart.data.datasets.push({
            data: generateData(),
            backgroundColor: newColor,
            borderColor: newColor
        });
        chart.update();
    }

    // eslint-disable-next-line no-unused-vars
    function randomize() {
        chart.data.datasets.forEach(function(dataset) {
            dataset.data = generateData();
        });
        chart.update();
    }

    // eslint-disable-next-line no-unused-vars
    function removeDataset() {
        chart.data.datasets.shift();
        chart.update();
    }

    chart.canvas.parentNode.style.height = '335px';
    chart.canvas.parentNode.style.width = '100%';
});