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
        
        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Inspired by{' '}
            <a 
              href="https://github.com/shankarananth/TarkaDyS" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              TarkaDyS
            </a>
            {' '} Built with Next.js and TypeScript
          </p>
        </footer>
      </div>
    </div>
  );
}
