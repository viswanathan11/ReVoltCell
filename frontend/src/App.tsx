import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Cells } from './pages/Cells';
import { CellDetails } from './pages/CellDetails';
import { CellTests } from './pages/CellTests';
import { NewTest } from './pages/NewTest';
import { TestDetails } from './pages/TestDetails';
import { Analysis } from './pages/Analysis';
import { Applications } from './pages/Applications';
import { Matching } from './pages/Matching';
import { Lifecycle } from './pages/Lifecycle';
import { Passport } from './pages/Passport';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cells" element={<Cells />} />
            <Route path="/cells/:cellId" element={<CellDetails />} />
            <Route path="/cells/:cellId/tests" element={<CellTests />} />
            <Route path="/test/new" element={<NewTest />} />
            <Route path="/test/:testId" element={<TestDetails />} />
            <Route path="/analysis/:cellId" element={<Analysis />} />
            <Route path="/applications/:cellId" element={<Applications />} />
            <Route path="/matching/:cellId" element={<Matching />} />
            <Route path="/lifecycle/:cellId" element={<Lifecycle />} />
            <Route path="/passport/:cellId" element={<Passport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
