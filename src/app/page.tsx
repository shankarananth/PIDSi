'use client';

import PidSimulator from '@/components/PidSimulator';

export default function Home() {
  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              PIDSi
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-1">
              Professional PID Control System Simulator
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Advanced web-based PID controller simulation with real-time visualization
            </p>
          </div>
        </header>
        
        <main>
          <PidSimulator />
        </main>
        

      </div>
    </div>
  );
}
