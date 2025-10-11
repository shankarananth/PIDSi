'use client';

import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { SimulationData } from '@/lib/SimulationEngine';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface RealtimeChartProps {
  data: SimulationData[];
  height?: number;
  timeRange?: number;
  yMin?: number;
  yMax?: number;
  cvMin?: number;
  cvMax?: number;
  onScaleChange?: (scales: {
    timeRange: number;
    yMin?: number;
    yMax?: number;
    cvMin?: number;
    cvMax?: number;
  }) => void;
}

const RealtimeChart: React.FC<RealtimeChartProps> = ({ 
  data, 
  height = 400, 
  timeRange = 60,
  yMin,
  yMax,
  cvMin = 0,
  cvMax = 100,
  onScaleChange 
}) => {
  const chartRef = useRef<ChartJS<'line', number[], number>>(null);

  // Prepare chart data
  const chartData = {
    labels: data.map(d => d.time),
    datasets: [
      {
        label: 'Process Variable (PV)',
        data: data.map(d => d.processValue),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Setpoint (SP)',
        data: data.map(d => d.setpoint),
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Controller Output (CV)',
        data: data.map(d => d.controllerOutput),
        borderColor: 'rgb(16, 185, 129)', // green-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            return `Time: ${tooltipItems[0]?.label || '0.0'}s`;
          },
          label: (tooltipItem: TooltipItem<'line'>) => {
            return `${tooltipItem.dataset.label || 'Data'}: ${tooltipItem.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Time (seconds)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1,
        },
        ticks: {
          maxTicksLimit: 10,
          callback: function(value: string | number) {
            return Number(value).toFixed(0) + 's';
          },
        },
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: 'PV / SP Value',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1,
        },
        ticks: {
          callback: function(value: string | number) {
            return Number(value).toFixed(1);
          },
        },
        min: yMin,
        max: yMax,
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: {
          display: true,
          text: 'CV Output (%)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: string | number) {
            return Number(value).toFixed(0) + '%';
          },
        },
        min: cvMin,
        max: cvMax,
      },
    },
    elements: {
      line: {
        tension: 0.1,
      },
    },
    animation: {
      duration: 0, // Disable animations for real-time performance
    },
  };

  // Auto-scroll functionality
  useEffect(() => {
    const chart = chartRef.current;
    if (chart && data.length > 0) {
      const latestTime = data[data.length - 1].time;
      const minTime = Math.max(0, latestTime - timeRange);
      
      // Update x-axis range
      if (chart.options.scales?.x) {
        chart.options.scales.x.min = minTime;
        chart.options.scales.x.max = latestTime;
      }
      
      chart.update('none');
    }
  }, [data, timeRange]);

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-lg font-medium">No Data</p>
            <p className="text-sm">Start the simulation to see real-time trends</p>
          </div>
        </div>
      ) : (
        <Line 
          ref={chartRef}
          data={chartData} 
          options={options} 
        />
      )}
    </div>
  );
};

export default RealtimeChart;