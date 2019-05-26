// Copyright (C) 2015 Nicholas Parker <nickbp@gmail.com>
// License: GPLv3, see LICENSE file

// --- SAVINGS CHART

function setSavingsSlidersToTextValues() {
    var prefix = "savings";
    setSliderToTextValue(prefix, "years", 1000);
    setSliderToTextValue(prefix, "startval");
    setSliderToTextValue(prefix, "depositamount");
    setSliderToTextValue(prefix, "interestrate");
    setSliderToTextValue(prefix, "expenserate", 100);
    setSliderToTextValue(prefix, "endval");
}

function drawSavingsChartFromSliders() {
    var prefix = "savings",
        selectedRadioId = getSelectedRadioSuffix(prefix);

    var year_count = getSlider(prefix, "years").slider("option", "value"),
        start_val = parseInt(getSlider(prefix, "startval").slider("option", "value")),
        deposit_period = toPeriodEnum(getCombo(prefix, "depositperiod").val()),
        deposit_val = parseInt(getSlider(prefix, "depositamount").slider("option", "value")),
        interest_rate_pts = getSlider(prefix, "interestrate").slider("option", "value"),
        expense_rate_pts = getSlider(prefix, "expenserate").slider("option", "value"),
        end_val = parseInt(getSlider(prefix, "endval").slider("option", "value"));

    // Shortcuts for calculations below:
    var interest_rate_for_math = (interest_rate_pts - expense_rate_pts) / 100.,
        intervals_for_math = year_count;
    if (deposit_period == PeriodEnum.MONTHLY) {
        interest_rate_for_math /= 12;
        intervals_for_math *= 12;
    }
    var pow_interest_intervals =
        Math.pow(1 + interest_rate_for_math, intervals_for_math); // (1 + i)^n

    function getApproxInterestPts() {
        function getEndvalForInterest(test_interest_for_math) {
            if (test_interest_for_math == 0) {
                return start_val + deposit_val * intervals_for_math;
            } else {
                // B = A(1 + ti)^n + P[(1 + ti)^n - 1] / ti
                var pow_test_interest_intervals =
                    Math.pow(1 + test_interest_for_math, intervals_for_math); // (1 + ti)^n
                var endval = start_val * pow_test_interest_intervals
                    + deposit_val * (pow_test_interest_intervals - 1) / test_interest_for_math;
                return endval;
            }
        }
        var test_interest_for_math = interest_rate_for_math, jump = 0.01;
        while (jump >= 0.000001) {
            // Move in positive direction until we exceed end_val
            while (true) {
                var test_endval = getEndvalForInterest(test_interest_for_math);
                if (test_endval < end_val) {
                    test_interest_for_math += jump;
                } else {
                    break;
                }
            }
            jump /= 2;

            // Move in negative direction until we are under end_val
            while (true) {
                var test_endval = getEndvalForInterest(test_interest_for_math);
                if (test_endval > end_val) {
                    test_interest_for_math -= jump;
                } else {
                    break;
                }
            }
            jump /= 2;
        }

        test_interest_for_math *= 100;
        if (deposit_period == PeriodEnum.MONTHLY) {
            test_interest_for_math *= 12;
        }
        return test_interest_for_math;
    }

    // Solve for the selected radio item:
    // A = start val, B = end val, P = payment, n = num intervals, i = interest rate
    if (selectedRadioId == "startval") {
        // B = A(1 + i)^n + P[(1 + i)^n - 1] / i
        // A = {B - P[(1 + i)^n - 1] / i} / (1 + i)^n
        if (interest_rate_for_math == 0) {
            start_val = end_val - deposit_val * intervals_for_math;
        } else {
            start_val = (end_val - deposit_val * (pow_interest_intervals - 1) / interest_rate_for_math)
                / pow_interest_intervals;
        }
        if (start_val < 0) {
            start_val = 0;
        }
    } else if (selectedRadioId == "depositamount") {
        if (interest_rate_for_math == 0) {
            deposit_val = (end_val - start_val) / intervals_for_math;
        } else {
            // B = A(1 + i)^n + P[(1 + i)^n - 1] / i
            // B - A(1 + i)^n = P[(1 + i)^n - 1] / i
            // P = i * [B - A(1 + i)^n] / [(1 + i)^n - 1]
            deposit_val = interest_rate_for_math
                * (end_val - start_val * pow_interest_intervals)
                / (pow_interest_intervals - 1);
        }
    } else if (selectedRadioId == "years") {
        if (interest_rate_for_math == 0) {
            year_count = (end_val - start_val) / deposit_val;
        } else {
            // B = A(1 + i)^n + P[(1 + i)^n - 1] / i
            // B = A(1 + i)^n + (P/i)(1 + i)^n - P/i
            // B + P/i = A(1 + i)^n + (P/i)(1 + i)^n
            // B + P/i = (A + P/i)(1 + i)^n
            // (B + P/i)/(A + P/i) = (1 + i)^n
            // n = log[(B + P/i)/(A + P/i)] / log(1 + i)
            year_count = Math.log((end_val + deposit_val / interest_rate_for_math)
                                  / (start_val + deposit_val / interest_rate_for_math))
                / Math.log(1 + interest_rate_for_math);
        }
        if (deposit_period == PeriodEnum.MONTHLY) {
            year_count /= 12;
        }
        if (isNaN(year_count) || year_count > 1000) {
            year_count = 1000;
        }
    } else if (selectedRadioId == "interestrate") {
        var soln_pts = getApproxInterestPts();
        interest_rate_pts = soln_pts + expense_rate_pts;
    } else if (selectedRadioId == "expenserate") {
        var soln_pts = getApproxInterestPts();
        expense_rate_pts = interest_rate_pts - soln_pts;
    } else if (selectedRadioId == "endval") {
        // B = A(1 + i)^n + P[(1 + i)^n - 1] / i
        end_val = start_val * pow_interest_intervals
            + deposit_val * (pow_interest_intervals - 1) / interest_rate_for_math;
    }

    // Update text boxes to reflect the solution:
    updateTextValue(prefix, "years", selectedRadioId, year_count, ValTypeEnum.NUMBER);
    updateTextValue(prefix, "startval", selectedRadioId, start_val, ValTypeEnum.MONEY);
    updateTextValue(prefix, "depositamount", selectedRadioId, deposit_val, ValTypeEnum.MONEY);
    updateTextValue(prefix, "interestrate", selectedRadioId, interest_rate_pts, ValTypeEnum.PERCENTAGE);
    updateTextValue(prefix, "expenserate", selectedRadioId, expense_rate_pts, ValTypeEnum.PERCENTAGE);
    updateTextValue(prefix, "endval", selectedRadioId, end_val, ValTypeEnum.MONEY);

    // Update the chart to reflect the solution:
    year_count = Math.ceil(year_count); // round up for charting purposes
    var vals = savingsChartCalc(
        year_count, start_val,
        deposit_period, deposit_val,
        interest_rate_pts * 0.01, expense_rate_pts * 0.01);
    var corrected_principal_end = vals.principal_end; // if expenses are high, principal may be eaten away
    if (vals.principal_end > vals.balance_end) {
        corrected_principal_end = vals.balance_end;
    }
    var income_end = vals.balance_end - corrected_principal_end;
    var expense_pct_of_balance = (100 * vals.expense_end / (vals.expense_end + vals.balance_end)).toFixed(0);
    var labels = [
        "Principal: " + formatMoney(corrected_principal_end),
        "Income: " + formatMoney(income_end),
        "Final Balance: " + formatMoney(vals.balance_end),
        "Expenses: " + formatMoney(vals.expense_end)
            + " (" + expense_pct_of_balance + "% of balance)",
    ];
    var layers = [
        {name: labels[0], color: "#8b8", values: vals.principals},
        {name: labels[1], color: "#ada", values: vals.balances},
        {name: "Expenses: " + formatMoney(vals.expense_end), color: "#daa", values: vals.expenses},
    ];
    var maxacrossall = vals.expenses[year_count].yhigh;
    drawChart("#savings-viz", year_count, maxacrossall, labels, layers, 6, true);
}

function savingsChartCalc(
    year_count, start_val,
    deposit_period, deposit_val,
    interest_rate, expense_rate) {

    var principals = [], expenses = [], balances = [];
    var principal = start_val, balance_best = start_val, balance_expense = start_val;
    principals[0] = {x: 0, ylow: 0, yhigh: principal};
    balances[0] = {x: 0, ylow: principal, yhigh: balance_expense};
    expenses[0] = {x: 0, ylow: balance_expense, yhigh: balance_best};
    for (var year = 1; year <= year_count; ++year) {
        if (deposit_period == PeriodEnum.MONTHLY) {
            principal += 12 * deposit_val;
            for (var mo = 0; mo < 12; ++mo) {
                balance_best = (balance_best + deposit_val) * (1 + (interest_rate / 12));
                balance_expense = (balance_expense + deposit_val) * (1 + ((interest_rate - expense_rate) / 12));
            }
        } else { // annual
            principal += deposit_val;
            balance_best = (balance_best + deposit_val) * (1 + interest_rate);
            balance_expense = (balance_expense + deposit_val) * (1 + interest_rate - expense_rate);
        }

        var principal_bottom = Math.max(principal, 0),
            balance_expense_bottom = Math.max(balance_expense, 0),
            balance_best_bottom = Math.max(balance_best, 0);
        principals[year] = {x: year, ylow: 0, yhigh: principal_bottom};
        balances[year] = {x: year, ylow: principal_bottom, yhigh: balance_expense_bottom};
        expenses[year] = {x: year, ylow: balance_expense_bottom, yhigh: balance_best_bottom};
    }
    return {balances: balances, principals: principals, expenses: expenses,
            balance_end: balance_expense,
            principal_end: principal,
            expense_end: balance_best - balance_expense};
}

savings_slider_prototype = {
    slide: function(e, ui) {
        drawSavingsChartFromSliders();
    },
    stop: function(e, ui) {
        drawSavingsChartFromSliders();
    },
};
getSlider("savings", "startval").slider(jQuery.extend(savings_slider_prototype, {
    value: 1000,
    min: 0,
    max: 1000000,
    step: 1000,
}));
getSlider("savings", "depositamount").slider(jQuery.extend(savings_slider_prototype, {
    value: 100,
    min: 0,
    max: 10000,
    step: 100,
}));
getSlider("savings", "years").slider(jQuery.extend(savings_slider_prototype, {
    value: 40,
    min: 1,
    max: 100,
    step: 1,
}));
getSlider("savings", "interestrate").slider(jQuery.extend(savings_slider_prototype, {
    value: 5,
    min: 0,
    max: 20,
    step: 0.1,
}));
getSlider("savings", "expenserate").slider(jQuery.extend(savings_slider_prototype, {
    value: 0.2,
    min: 0,
    max: 2,
    step: 0.1,
}));
getSlider("savings", "endval").slider(jQuery.extend(savings_slider_prototype, {
    value: 0,
    min: 0,
    max: 10000000,
    step: 10000,
}));

// --- LOAN CHART

function setLoanSlidersToTextValues() {
    var prefix = "loan";
    setSliderToTextValue(prefix, "startval");
    setSliderToTextValue(prefix, "interestrate");
    setSliderToTextValue(prefix, "depositamount");
    setSliderToTextValue(prefix, "years", 100);
}

function drawLoanChartFromSliders() {
    var prefix = "loan",
        selected_radio_id = getSelectedRadioSuffix(prefix);

    var start_val = parseInt(getSlider(prefix, "startval").slider("option", "value")),
        interest_rate_pts = getSlider(prefix, "interestrate").slider("option", "value"),
        year_count = getSlider(prefix, "years").slider("option", "value"),
        payment_period = toPeriodEnum(getCombo(prefix, "depositperiod").val()),
        payment_val = parseInt(getSlider(prefix, "depositamount").slider("option", "value"));

    // Shortcuts for calculations below:
    var interest_rate_for_math = interest_rate_pts / 100.,
        intervals_for_math = year_count;
    if (payment_period == PeriodEnum.MONTHLY) {
        interest_rate_for_math /= 12;
        intervals_for_math *= 12;
    }

    // Solve for the selected radio item:
    if (selected_radio_id == "startval") {
        if (interest_rate_for_math == 0) {
            start_val = intervals_for_math * payment_val;
        } else {
            start_val = payment_val / interest_rate_for_math
                * (1 - Math.pow(1 + interest_rate_for_math, -intervals_for_math))
        }
    } else if (selected_radio_id == "interestrate") {
        var q = Math.log(1 + 1. / intervals_for_math) / Math.log(2);
        var p = Math.pow(1 + (1. * payment_val) / start_val, 1 / q);
        interest_rate_pts = (Math.pow(p - 1, q) - 1) * 100;
        if (payment_period == PeriodEnum.MONTHLY) {
            interest_rate_pts *= 12;
        }
    } else if (selected_radio_id == "years") {
        if (interest_rate_for_math == 0) {
            year_count = start_val / payment_val;
        } else {
            year_count = -Math.log(1 - (interest_rate_for_math * start_val / payment_val))
                / Math.log(1 + interest_rate_for_math);
        }
        if (payment_period == PeriodEnum.MONTHLY) {
            year_count /= 12;
        }
        if (isNaN(year_count) || year_count > 1000) {
            year_count = 1000;
        }
    } else if (selected_radio_id == "depositamount") {
        if (interest_rate_for_math == 0) {
            payment_val = start_val / intervals_for_math;
        } else {
            payment_val = interest_rate_for_math * start_val
                / (1 - Math.pow(1 + interest_rate_for_math, -intervals_for_math));
        }
    }

    // Update text boxes to reflect the solution:
    updateTextValue(prefix, "startval", selected_radio_id, start_val, ValTypeEnum.MONEY);
    updateTextValue(prefix, "interestrate", selected_radio_id, interest_rate_pts, ValTypeEnum.PERCENTAGE);
    updateTextValue(prefix, "years", selected_radio_id, year_count, ValTypeEnum.NUMBER);
    updateTextValue(prefix, "depositamount", selected_radio_id, payment_val, ValTypeEnum.MONEY);

    // Update the chart to reflect the solution:
    year_count = Math.ceil(year_count); // round up for charting purposes
    var vals = loanChartCalc(
        year_count, start_val, payment_period, payment_val, interest_rate_pts * 0.01);
    var labels = [
        "Total Payments: " + formatMoney(start_val + vals.interest_cost),
        "Loan Cost: " + formatMoney(vals.interest_cost)
            + " (" + (100 * vals.interest_cost / (start_val + vals.interest_cost)).toFixed(1) + "% of payments)",
    ];
    var layers = [
        {name: "Payment against Interest", color: "#daa", values: vals.interest_spending},
        {name: "Payment against Principal", color: "#8b8", values: vals.principal_spending},
        {name: "Remaining Loan", color: "#ada", values: vals.remaining},
    ];
    var maxacrossall = Math.max(start_val, vals.interest_spending[year_count].yhigh);
    drawChart("#loan-viz", year_count, maxacrossall, labels, layers, 4, false);
}

function loanChartCalc(
    year_count, start_val,
    payment_period, payment_val,
    interest_rate) {

    var interest_cost = 0, year_payments = payment_val;
    if (payment_period == PeriodEnum.MONTHLY) {
        interest_rate /= 12;
        interest_cost = payment_val * year_count * 12 - start_val;
        year_payments *= 12;
    } else { // annual
        interest_cost = payment_val * year_count - start_val;
    }

    var interest_spending = [], principal_spending = [], remaining = [];
    var balance = start_val;
    for (var year = 1; year <= year_count; ++year) {
        var year_interest = 0;
        if (payment_period == PeriodEnum.MONTHLY) {
            for (var mo = 0; mo < 12; ++mo) {
                year_interest += (balance * interest_rate);
                balance += (balance * interest_rate) - payment_val;
            }
        } else { // annual
            year_interest += (balance * interest_rate);
            balance += (balance * interest_rate) - payment_val;
        }

        var balance_bottom = Math.max(balance, 0),
            interest_bottom = Math.max(balance - year_interest, 0),
            principal_bottom = Math.max(balance - year_payments, 0);
        interest_spending[year] = {x: year, ylow: interest_bottom, yhigh: balance_bottom};
        principal_spending[year] = {x: year, ylow: principal_bottom, yhigh: interest_bottom};
        remaining[year] = {x: year, ylow: 0, yhigh: principal_bottom};
    }
    // For year0, make up interpolated values that are visibly similar to year1:
    // TODO this falls apart if we pay off a loan in 1 year: year0 interpolates against zero!
    //      is there a better way of doing this?
    var interest_interpolate_val = principal_spending[1].yhigh / interest_spending[1].yhigh * start_val;
    interest_spending[0] = {x: 0, ylow: interest_interpolate_val, yhigh: start_val};
    var principal_interpolate_val = remaining[1].yhigh / interest_spending[1].yhigh * start_val;
    principal_spending[0] = {x: 0, ylow: principal_interpolate_val, yhigh: interest_interpolate_val};
    remaining[0] = {x: 0, ylow: 0, yhigh: principal_interpolate_val};
    return {interest_spending: interest_spending,
            principal_spending: principal_spending,
            remaining: remaining,
            interest_cost: interest_cost};
}

loan_slider_prototype = {
    slide: function(e, ui) {
        drawLoanChartFromSliders();
    },
    stop: function(e, ui) {
        drawLoanChartFromSliders();
    },
};
getSlider("loan", "startval").slider(jQuery.extend(loan_slider_prototype, {
    value: 100000,
    min: 0,
    max: 1000000,
    step: 1000,
}));
getSlider("loan", "interestrate").slider(jQuery.extend(loan_slider_prototype, {
    value: 5,
    min: 0,
    max: 20,
    step: 0.1,
}));
getSlider("loan", "years").slider(jQuery.extend(loan_slider_prototype, {
    value: 30,
    min: 1,
    max: 100,
    step: 1,
}));
getSlider("loan", "depositamount").slider(jQuery.extend(loan_slider_prototype, {
    value: 1000,
    min: 0,
    max: 10000,
    step: 100,
}));

// --- COMMON

function formatMoney(val) {
    var prefix = "$";
    function formatDollars(divval, suffix) {
        return prefix + divval.toFixed(1) + suffix;
    }
    if (val >= 1000000000000) {
        return formatDollars(val / 1000000000000, "T");
    } else if (val >= 1000000000) {
        return formatDollars(val / 1000000000, "B");
    } else if (val >= 1000000) {
        return formatDollars(val / 1000000, "M");
    } else if (val >= 10000) { // don't abbreviate under 10k
        return formatDollars(val / 1000, "K");
    }
    return prefix + val.toFixed(2);
}

function getTextbox(prefix, suffix) {
    return $("#" + prefix + "-text-" + suffix);
}

function getSlider(prefix, suffix) {
    return $("#" + prefix + "-slider-" + suffix);
}

function getCombo(prefix, suffix) {
    return $("#" + prefix + "-combo-" + suffix);
}

var PeriodEnum = {
    MONTHLY: "monthly",
    ANNUALLY: "annually"
}
function toPeriodEnum(period_string) {
    if (period_string == "monthly") {
        return PeriodEnum.MONTHLY;
    } else {
        return PeriodEnum.ANNUALLY;
    }
}

var ValTypeEnum = {
    NUMBER: "number",
    MONEY: "money",
    PERCENTAGE: "percentage"
}
function updateTextValue(prefix, suffix, selected_radio_id, value, valtype) {
    if (suffix == selected_radio_id) {
        value = value.toFixed(2);
    }
    if (valtype == ValTypeEnum.MONEY) {
        value = "$" + value;
    } else if (valtype == ValTypeEnum.PERCENTAGE) {
        value = value + "%";
    }
    getTextbox(prefix, suffix).val(value);
}

function setSliderToTextValue(prefix, suffix, hard_max) {
    var slider = getSlider(prefix, suffix),
        val = parseFloat(getTextbox(prefix, suffix).val()
                         .replace("$","")
                         .replace("%","")
                         .replace(",","")),
        min = slider.slider("option", "min");
    // Enforce min and hard max. Normal max may be exceeded with manual text input.
    if (val < min) {
        slider.slider("option", "value", min);
    } else if (hard_max && val > hard_max) {
        slider.slider("option", "value", hard_max);
    } else {
        slider.slider("option", "value", val);
    }
}

function getSelectedRadioSuffix(prefix) {
    selected_id = $("input[name='" + prefix + "-fill']:checked")[0].id;
    id_prefix = prefix + "-radio-";
    return selected_id.substr(id_prefix.length, selected_id.length - id_prefix.length)
}

function updateEnabledFields(prefix) {
    var i, radio, radios = $("input[name='" + prefix + "-fill']");
    var id_prefix = prefix + "-radio-";
    for (i = 0; i < radios.length; ++i) {
        radio = radios[i];
        id_suffix = radio.id.substr(id_prefix.length, radio.id.length - id_prefix.length);
        getTextbox(prefix, id_suffix).prop("disabled", radio.checked);
        getSlider(prefix, id_suffix).slider({disabled: radio.checked});
    }
}

function drawChart(output_div, years, maxacrossall, labels, layers, inputfield_count, increasing_vals) {
    var bottom_margin = 110 + inputfield_count * 35;
    var width = $(window).width() - 50, height = $(window).height() - bottom_margin;
    d3.select(output_div).select("svg").remove();
    var svg = d3.select(output_div).append("svg");
    svg.attr("width", width).attr("height", height);

    var xpadding = 80, ypaddingtop = 20, ypaddingbot = 40;
    var xscale = d3.scale.linear()
        .domain([0, years])
        .range([0, width - xpadding - xpadding]);
    var yscale = d3.scale.linear()
        .domain([0, maxacrossall])
        .range([height - ypaddingbot, ypaddingtop]);

    var area = d3.svg.area()
        .x(function(d) { return xscale(d.x); })
        .y0(function(d) { return yscale(d.ylow); })
        .y1(function(d) { return yscale(d.yhigh); });
    var stack = d3.layout.stack()
        .offset("zero")
        .values(function(d) { return d.values; });
    svg.selectAll("chartarea").data(stack(layers)).enter()
        .append("path").attr("d", function(d) { return area(d.values); })
        .attr("transform", "translate(" + xpadding + ",0)") // move right
        .style("fill", function(d) { return d.color; })
        .append("title").text(function(d) { return d.name; });

    // X-axis: move to bottom and right slightly
    svg.append("g")
        .attr("class", "x axis") // css class
        .attr("transform", "translate(" + xpadding + "," + (height - ypaddingbot) + ")")
        .call(d3.svg.axis().scale(xscale).orient("bottom").ticks(10))
    yaxisformat = d3.svg.axis().scale(yscale).ticks(10).tickFormat(formatMoney);
    // Y-axis (left): move right a little
    svg.append("g")
        .attr("class", "y axis") // css class
        .attr("transform", "translate(" + xpadding + ",0)")
        .call(yaxisformat.orient("left"));
    // Y-axis (right): move right a lot
    svg.append("g")
        .attr("class", "y axis") // css class
        .attr("transform", "translate(" + (width - xpadding) + ",0)")
        .call(yaxisformat.orient("right"));

    var textpadding = 20, textheight = 20;
    if (increasing_vals) {
        // put labels in upper left corner
        for (var i = 0; i < labels.length; i++) {
            svg.append("text")
                .text(labels[i])
                .attr("x", xpadding + textpadding)
                .attr("y", ypaddingtop + textpadding + (i * textheight));
        }
    } else {
        // put labels in upper right corner
        for (var i = 0; i < labels.length; i++) {
            svg.append("text")
                .text(labels[i])
                .style("text-anchor","end")
                .attr("x", width - xpadding - textpadding)
                .attr("y", ypaddingtop + textpadding + (i * textheight));
        }
    }
}

$("#tabs").tabs();

$(document).ready(function() {
    updateEnabledFields("savings");
    $("input[name='savings-fill']").change(function() {
        updateEnabledFields("savings");
        setSavingsSlidersToTextValues();
        drawSavingsChartFromSliders();
    });

    drawSavingsChartFromSliders();
    $("#savings .combo").change(function() {
        drawSavingsChartFromSliders();
    });
    $("#savings .textfield").change(function() {
        setSavingsSlidersToTextValues();
        drawSavingsChartFromSliders();
    });

    updateEnabledFields("loan");
    $("input[name='loan-fill']").change(function() {
        updateEnabledFields("loan");
        setLoanSlidersToTextValues();
        drawLoanChartFromSliders();
    });

    drawLoanChartFromSliders();
    $("#loan .combo").change(function() {
        drawLoanChartFromSliders();
    });
    $("#loan .textfield").change(function() {
        setLoanSlidersToTextValues();
        drawLoanChartFromSliders();
    });
});

$(window).resize(function() {
    drawSavingsChartFromSliders();
    drawLoanChartFromSliders();
});
