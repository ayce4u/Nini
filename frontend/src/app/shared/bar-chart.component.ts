import { AfterViewInit, Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import type { Chart as ChartType } from 'chart.js';
import { fcfa, shortFcfa } from '../core/format';

/** Graphique en barres (chiffre d'affaires) avec une courbe (nombre de rendez-vous). */
@Component({
  selector: 'nini-bar-chart',
  template: `<div class="box" [style.height]="height()"><canvas #canvas></canvas></div>`,
  styles: `.box { position: relative; width: 100%; }`,
})
export class BarChartComponent implements AfterViewInit, OnDestroy {
  readonly labels = input<string[]>([]);
  readonly revenue = input<number[]>([]);
  readonly counts = input<number[]>([]);
  readonly height = input('240px');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: ChartType;

  constructor() {
    effect(() => {
      const labels = this.labels();
      const revenue = this.revenue();
      const counts = this.counts();
      if (!this.chart) return;
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = revenue;
      this.chart.data.datasets[1].data = counts;
      this.chart.update();
    });
  }

  async ngAfterViewInit() {
    const { Chart, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } =
      await import('chart.js');
    Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = '#6b6257';

    this.chart = new Chart(this.canvas().nativeElement, {
      data: {
        labels: this.labels(),
        datasets: [
          {
            type: 'bar',
            label: 'Chiffre d’affaires',
            data: this.revenue(),
            backgroundColor: '#e8762b',
            hoverBackgroundColor: '#cc6826',
            borderRadius: 6,
            maxBarThickness: 28,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Rendez-vous',
            data: this.counts(),
            borderColor: '#1f9d6b',
            backgroundColor: '#1f9d6b',
            pointRadius: 2,
            tension: 0.35,
            borderWidth: 2,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
          tooltip: {
            callbacks: {
              label: (ctx) => (ctx.datasetIndex === 0 ? ` ${fcfa(ctx.parsed.y ?? 0)}` : ` ${ctx.parsed.y} rendez-vous`),
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: {
            beginAtZero: true,
            grid: { color: '#f0e9de' },
            border: { display: false },
            ticks: { callback: (v) => shortFcfa(Number(v)), maxTicksLimit: 5 },
          },
          y1: { beginAtZero: true, position: 'right', grid: { display: false }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5 } },
        },
      },
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }
}
