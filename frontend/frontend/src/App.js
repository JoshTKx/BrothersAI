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
  const [invalidModules, setInvalidModules] = useState([]);
  
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

  useEffect(() => {
    if (modules.length > 0) {
      updateInvalidModules(modules, semester);
    }
  }, [semester, modules]);

  // Check if module code is valid(exists in NUSMods list)
  const isModuleValid = (code) => {
    return nusModsCache && nusModsCache.some(mod => mod.moduleCode === code.toUpperCase());
  };

  const isModuleOfferedInSem = async (modCode, sem) => {
    try {
      const res = await fetch(`https://api.nusmods.com/v2/2024-2025/modules/${modCode}.json`);
      const data = await res.json();
      return data.semesterData.some(s => String(s.semester) === sem);
    } catch {
      return false;
    }
  };
  
  // Update invalid module list based on semester currently selected
  const updateInvalidModules = async (mods, sem) => {
    const results = await Promise.all(
      mods.map(async (code) => {
        const offered = await isModuleOfferedInSem(code, sem);
        return !offered ? code : null;
      })
    );
    setInvalidModules(results.filter(Boolean));
  };

  const addModule = async () => {
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
    const offered = await isModuleOfferedInSem(modCode, semester);
    if (!offered) {
      setError(`Module ${modCode} is not offered in Semester ${semester}`);
      return;
    }
    const updatedModules = [...modules, modCode];
    setModules(updatedModules);
    await updateInvalidModules(updatedModules,semester);
    setModuleInput('');
  };

  const removeModule = async (code) => {
    const updated = modules.filter(mod => mod !== code);
    setModules(updated);
    await updateInvalidModules(updated, semester);
  };

  const semesterChange = async (e) => {
    const newSem = e.target.value;
    setSemester(newSem);

    // const results = await Promise.all(
    //   modules.map(async (code) => {
    //     const offered = await isModuleOfferedInSem(code, newSem);
    //     return !offered ? code : null;
    //   })
    // );
    // const invalids = results.filter(Boolean);
    // setInvalidModules(invalids);
  
    // if (invalids.length > 0) {
    //   const semLabel = newSem === '3' ? 'Special Term I' : newSem === '4' ? 'Special Term II' : `Semester ${newSem}`;
    //   setError(`Please remove modules not offered in ${semLabel}: ${invalids.join(', ')}`);
    // } else {
    //   setError('');
    // }
  };


  const generateTimetable = async() => {
    setError('');
    setTimetable(null);
    if (modules.length === 0){
      setError('Please add at least 1 module');
      return;
    }
    if (invalidModules.length > 0){
      setError(`Please remove modules not offered in Semester ${semester}: ${invalidModules.join(', ')}`);
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
          <li key={i} style={{color: invalidModules.includes(mod) ? 'red' : 'black'}}>
            {mod} {invalidModules.includes(mod) && '(Not offered this semester)'}
            <button onClick={() => removeModule(mod)} style={{marginLeft: '10px'}}>X</button>
          </li>
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