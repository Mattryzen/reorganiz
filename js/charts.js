/* =========================================================
   CHARTS — rendu du graphique de complétion (Chart.js)
   ========================================================= */
let completionChartInstance = null;

function renderCompletionChart(series){
  const canvas = document.getElementById('completionChart');
  if(!canvas || typeof Chart === 'undefined') return;

  const labels = series.map(d => d.label);
  const values = series.map(d => d.rate);

  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue('--color-primary').trim() || '#2F5DFF';
  const primaryLight = styles.getPropertyValue('--color-primary-light').trim() || '#E8EEFF';
  const textSoft = styles.getPropertyValue('--color-text-soft').trim() || '#5B6478';
  const border = styles.getPropertyValue('--color-border').trim() || '#E1E7F5';

  if(completionChartInstance){
    completionChartInstance.data.labels = labels;
    completionChartInstance.data.datasets[0].data = values;
    completionChartInstance.update();
    return;
  }

  completionChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Taux de complétion',
        data: values,
        borderColor: primary,
        backgroundColor: primaryLight,
        pointBackgroundColor: primary,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        spanGaps: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.raw === null ? 'Pas de donnée' : `${ctx.raw}% des tâches faites`,
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { stepSize: 25, color: textSoft, callback: (v) => `${v}%` },
          grid: { color: border },
        },
        x: {
          ticks: { color: textSoft },
          grid: { display: false },
        },
      },
    },
  });
}
