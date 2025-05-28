import React from 'react';
import { useState, useEffect } from 'react';
import './App.css';


function App() {

  const [moduleInput, setModuleInput] = useState('');
  const [modules, setModules] = useState([]);
  const [nusModsCache, setNusModsCache] = useState([]);
  const [semester, setSemester] = useState('1');
  const [error, setError] = useState('');
  const [timetable, setTimetable] = useState(null);
  
  // Fetch NUSMods module list and cache it
  useEffect(() => {
    const fetchModuleData = async() => {
      try {
        const res = await fetch('https://api.nusmods.com/v2/2024-2025/moduleList.json')
        const data = await res.json();
        setNusModsCache(data);
      } catch(err) {
        setError('Failed to fetch module data');
      }
    };
    fetchModuleData();
  }, []);

  // Check if module code is valid(exists in NUSMods list)
  const isModuleValid = (code) => {
    return nusModsCache && nusModsCache.some(mod => mod.moduleCode === code.toUpperCase());
  };

  const addModule = () => {
    const modCode = moduleInput.trim().toUpperCase();
    setError('');
    if (!modCode){
      setError('Please enter a module code');
      return;
    }
    if (!isModuleValid(modCode)){
      setError(`Invalid module code: ${modCode}`);
      return;
    }
    if (modules.includes(modCode)){
      setError(`Module ${modCode} is already added`);
      return;
    }
    setModules([...modules, modCode]);
    setModuleInput('');
    setError('');
  };


  const generateTimetable = async() => {
    setError('');
    setTimetable(null);
    if (modules.length === 0){
      setError('Please add at least 1 module');
      return;
    }

    try {
      const resp = await fetch('http://localhost:8000/api/generate-timetable/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({modules, semester}),
      });
      
      if (!resp.ok) {
        const errData = await resp.json();
        setError(errData.error || 'Failed to generate timetable');
        return;
      }

      const data = await resp.json();
      setTimetable(data);
    } catch (e) {
      setError('Network error generating timetable');
    }
  };

  return (
    <div className='App'>
      <h1>Timetable</h1>

      <div>
        <label>
          Semester:
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value={"1"}>Semester 1</option>
            <option value={"2"}>Semester 2</option>
            <option value={"3"}>Special Term 1</option>
            <option value={"4"}>Special Term 2</option>
          </select>
        </label>
      </div>

      <div>
        <input
          type='text'
          value={moduleInput}
          onChange={(e) => setModuleInput(e.target.value)}
          placeholder="Enter module code (e.g., CS1101S)"
        />
        <button onClick={addModule}>Add Module</button>
      </div>

      {error && <p style={{color: 'red'}}>{error}</p>}

      <ul>
        {modules.map((mod,i) => (
          <li key={i}>{mod}</li>
        ))}
      </ul>

      <button onClick={generateTimetable}>Generate Timetable</button>

      {timetable && (
        <div>
          <h2>Generate Timetable</h2>
          <pre>{JSON.stringify(timetable, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App